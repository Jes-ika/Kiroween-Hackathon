// Ghostwire GW-1 — acoustic FSK codec (pure DSP, zero dependencies).
//
// Resurrection target: the 1962 Bell 103 / Bell 202 acoustic modem, reborn in
// the browser. Bit 1 = "mark" tone, bit 0 = "space" tone (Bell 202 homage:
// 1200/2200 Hz), 600 baud. Frames are protected by CRC-16/CCITT and clock
// recovery is anchored on the 0x55 preamble's alternating bits, so a laptop
// built in 2026 and a phone with a slightly different DAC still talk.
//
// This file is intentionally browser-free: Node tests exercise the exact same
// math the browser will transmit through the air.

import { crc16, GW1 } from './protocol.js';

export const DEFAULTS = {
  baud: 600,
  markFreq: 1200, // bit = 1
  spaceFreq: 2200, // bit = 0
  amp: 0.8,
  leadSilenceMs: 30, // silence before the first bit
  gapMs: 60, // silence between repeated packets (lets the burst splitter split)
  trailSilenceMs: 30,
  burstGapMs: 50, // decoder: silence that ends a burst
  maxBurstSec: 30, // decoder: hard cap so a stuck-open mic can't eat RAM
  threshold: 0.02, // decoder: RMS above this == carrier present
};

export function bytesToBitsLsb(bytes) {
  const bits = new Uint8Array(bytes.length * 8);
  let k = 0;
  for (let b = 0; b < bytes.length; b++) {
    for (let i = 0; i < 8; i++) bits[k++] = (bytes[b] >> i) & 1;
  }
  return bits;
}

export function bitsToBytesLsb(bits, start, count) {
  const out = new Uint8Array(Math.floor(count / 8));
  for (let i = 0; i < out.length; i++) {
    let v = 0;
    for (let j = 0; j < 8; j++) v |= (bits[start + i * 8 + j] & 1) << j;
    out[i] = v;
  }
  return out;
}

// Encode payloads (Uint8Array each, <= GW1.maxPayload) into one audio burst.
// Repeating the same payload is our v0 forward error correction: the receiver
// keeps the CRC-valid copies and the app layer de-dupes the ghost repeats.
export function encodePackets(payloads, opts = {}, sampleRate = 48000) {
  const p = { ...DEFAULTS, ...opts };
  const bitLen = Math.round(sampleRate / p.baud);
  const lead = Math.round((sampleRate * p.leadSilenceMs) / 1000);
  const gap = Math.round((sampleRate * p.gapMs) / 1000);
  const trail = Math.round((sampleRate * p.trailSilenceMs) / 1000);

  const bitArrays = payloads.map((pl) => bytesToBitsLsb(buildPacketBytes(pl)));
  let totalBits = 0;
  for (const bits of bitArrays) totalBits += bits.length;

  const total = lead + totalBits * bitLen + gap * (bitArrays.length - 1) + trail;
  const out = new Float32Array(total);
  const TWO_PI = 2 * Math.PI;
  let phase = 0; // phase-continuous across the whole burst: no clicks at bit edges
  let pos = lead;

  for (let pi = 0; pi < bitArrays.length; pi++) {
    const bits = bitArrays[pi];
    for (let bi = 0; bi < bits.length; bi++) {
      const f = bits[bi] ? p.markFreq : p.spaceFreq;
      const inc = (TWO_PI * f) / sampleRate;
      const end = pos + bitLen;
      for (let i = pos; i < end; i++) {
        out[i] = p.amp * Math.sin(phase);
        phase += inc;
      }
      pos = end;
    }
    if (pi < bitArrays.length - 1) pos += gap;
  }

  // 2 ms raised-cosine fades so the burst doesn't pop the speakers
  const fade = Math.round(sampleRate * 0.002);
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    out[lead + i] *= g;
    out[total - trail - 1 - i] *= g;
  }
  return out;
}

function buildPacketBytes(payload) {
  const len = payload.length;
  if (len > GW1.maxPayload) {
    throw new Error(`payload ${len}B exceeds GW-1 max of ${GW1.maxPayload}B`);
  }
  const data = new Uint8Array(1 + len);
  data[0] = len;
  data.set(payload, 1);
  const crc = crc16(data);
  const pkt = new Uint8Array(GW1.preambleCount + 1 + data.length + 2);
  let k = 0;
  for (let i = 0; i < GW1.preambleCount; i++) pkt[k++] = GW1.preamble;
  pkt[k++] = GW1.sync;
  for (let i = 0; i < data.length; i++) pkt[k++] = data[i];
  pkt[k++] = (crc >> 8) & 0xff;
  pkt[k] = crc & 0xff;
  return pkt;
}

// Goertzel tone-power difference over one window. Positive => mark (1) wins.
function goertzelDiff(s, t, win, cM, cS) {
  let s1m = 0, s2m = 0, s1s = 0, s2s = 0;
  const end = t + win;
  for (let i = t; i < end; i++) {
    const x = s[i];
    const tm = s1m; s1m = x + cM * s1m - s2m; s2m = tm;
    const ts = s1s; s1s = x + cS * s1s - s2s; s2s = ts;
  }
  const pm = s1m * s1m + s2m * s2m - cM * s1m * s2m;
  const ps = s1s * s1s + s2s * s2s - cS * s1s * s2s;
  return pm - ps;
}

// Decode one continuous audio burst into CRC-verified payloads.
// Pipeline: normalize -> sliding Goertzel tone power -> clock recovery from
// preamble transition spacing, refined by least-squares over the longest
// transition chain and guarded by a CRC-gated retry ladder (survives 44.1k/48k
// DAC mismatches across devices) -> phase alignment -> bit slice -> sync hunt.
export function decodeBurst(samples, opts = {}, sampleRate = 48000) {
  const p = { ...DEFAULTS, ...opts };
  const win = Math.round(sampleRate / p.baud);
  const n = samples.length;
  if (n < win * 16) return [];
  const hop = Math.max(1, Math.floor(win / 40));

  // DC removal + RMS normalize (mics have arbitrary gain)
  let mean = 0;
  for (let i = 0; i < n; i++) mean += samples[i];
  mean /= n;
  let energy = 0;
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = samples[i] - mean;
    s[i] = v;
    energy += v * v;
  }
  const rms = Math.sqrt(energy / n);
  if (rms < 1e-6) return [];
  const gn = 1 / rms;
  for (let i = 0; i < n; i++) s[i] *= gn;

  const cM = 2 * Math.cos((2 * Math.PI * p.markFreq) / sampleRate);
  const cS = 2 * Math.cos((2 * Math.PI * p.spaceFreq) / sampleRate);

  // Sliding tone-power on a fine grid (win/40 samples). Exact Goertzel runs
  // later at the chosen cell boundaries; the grid only steers the search.
  const last = n - win;
  const gLen = Math.max(1, Math.floor(last / hop));
  const d = new Float32Array(gLen);
  for (let g = 0; g < gLen; g++) d[g] = goertzelDiff(s, g * hop, win, cM, cS);

  // --- clock recovery: 0x55 preamble flips sign every bit period ---
  // Crossing positions get sub-grid refinement by linear interpolation
  // between the two grid points that straddle the sign change.
  const crossings = [];
  for (let g = 1; g < gLen; g++) {
    const a = d[g - 1];
    const b = d[g];
    if (!((a < 0 && b >= 0) || (a > 0 && b <= 0))) continue;
    const denom = a - b;
    let frac = denom !== 0 ? a / denom : 0.5;
    if (!(frac >= 0 && frac <= 1)) frac = 0.5;
    crossings.push((g - 1 + frac) * hop);
  }

  // Chain consecutive crossings spaced ~1 bit apart; the longest chain is
  // almost surely preamble+data of one clean frame region.
  let bestChain = [];
  let chain = [];
  for (let i = 1; i < crossings.length; i++) {
    const iv = crossings[i] - crossings[i - 1];
    if (iv > win * 0.8 && iv < win * 1.2) {
      if (chain.length === 0) chain.push(crossings[i - 1]);
      chain.push(crossings[i]);
    } else {
      if (chain.length > bestChain.length) bestChain = chain;
      chain = [];
    }
  }
  if (chain.length > bestChain.length) bestChain = chain;

  // Least-squares slope of position vs index: a clock estimate that stays
  // accurate over the WHOLE burst (a median can drift a few tenths of a
  // sample, which compounds over hundreds of bits).
  let bl = win;
  if (bestChain.length >= 8) {
    const m = bestChain.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < m; i++) {
      sx += i;
      sy += bestChain[i];
      sxx += i * i;
      sxy += i * bestChain[i];
    }
    const den = m * sxx - sx * sx;
    if (den !== 0) {
      const beta = (m * sxy - sx * sy) / den;
      if (beta > win * 0.6 && beta < win * 1.5) bl = beta;
    }
  }

  // --- CRC-gated retry ladder: escalate bit-length correction until a valid
  // --- frame escapes. Wrong guesses fail CRC cleanly, so this is safe.
  const relOffsets = [0, 0.004, -0.004, 0.008, -0.008, 0.015, -0.015, 0.025, -0.025, 0.04, -0.04, 0.06, -0.06];
  for (const ro of relOffsets) {
    const frames = extractFrames(s, win, bl * (1 + ro), p, cM, cS, d, gLen, hop);
    if (frames.length > 0) return frames;
  }
  return [];
}

function extractFrames(s, win, bl, p, cM, cS, d, gLen, hop) {
  const last = s.length - win;
  const nBits = Math.floor((last - win) / bl) - 1;
  if (nBits < 12) return [];

  // Phase alignment: pick the cell boundary with the strongest tone-energy
  // contrast across the whole burst (scored on the precomputed grid).
  const phiMax = Math.max(1, Math.round(bl));
  let bestPhi = 0;
  let bestScore = -1;
  for (let phi = 0; phi < phiMax; phi += 2) {
    let score = 0;
    for (let k = 0; k < nBits; k++) {
      const t = phi + Math.round(k * bl);
      const g = Math.min(gLen - 1, Math.round(t / hop));
      score += Math.abs(d[g]);
    }
    if (score > bestScore) {
      bestScore = score;
      bestPhi = phi;
    }
  }

  // Exact bit slicing at the aligned boundaries
  const bits = new Uint8Array(nBits);
  for (let k = 0; k < nBits; k++) {
    const t = bestPhi + Math.round(k * bl);
    bits[k] = goertzelDiff(s, t, win, cM, cS) > 0 ? 1 : 0;
  }

  // Sync hunt: only CRC-valid frames escape
  const frames = [];
  const frameBits = (len) => 8 + 8 + len * 8 + 16;
  let i = 0;
  while (i + frameBits(0) <= bits.length) {
    let isSync = true;
    for (let j = 0; j < 8; j++) {
      if (bits[i + j] !== ((GW1.sync >> j) & 1)) {
        isSync = false;
        break;
      }
    }
    if (isSync) {
      const len = bitsToBytesLsb(bits, i + 8, 8)[0];
      if (len <= GW1.maxPayload && i + frameBits(len) <= bits.length) {
        const raw = bitsToBytesLsb(bits, i + 8, 8 + len * 8 + 16);
        const calc = crc16(raw.subarray(0, 1 + len));
        const got = (raw[1 + len] << 8) | raw[2 + len];
        if (got === calc) {
          frames.push(Uint8Array.from(raw.subarray(1, 1 + len)));
          i += frameBits(len);
          continue;
        }
      }
    }
    i++;
  }
  return frames;
}

// Streaming decoder: accumulates samples, splits bursts on silence, and emits
// CRC-verified payload bytes. One instance serves both the séance in-page
// loop and the microphone.
export class Decoder {
  constructor(opts = {}, sampleRate = 48000, onPacket = null) {
    this.p = { ...DEFAULTS, ...opts };
    this.sr = sampleRate;
    this.onPacket = onPacket;
    this.buf = [];
    this.inBurst = false;
    this.silence = 0;
    this.level = 0; // latest chunk RMS, for the UI carrier meter
    this.stats = { bursts: 0, packets: 0 };
    this._maxBuf = Math.round(this.p.maxBurstSec * sampleRate);
    this._burstGapSamples = Math.round((this.p.burstGapMs / 1000) * sampleRate);
  }

  feed(chunk) {
    let e = 0;
    for (let i = 0; i < chunk.length; i++) e += chunk[i] * chunk[i];
    const rms = Math.sqrt(e / Math.max(1, chunk.length));
    this.level = rms;
    if (rms >= this.p.threshold) {
      this.inBurst = true;
      this.silence = 0;
      this.buf.push(chunk);
    } else if (this.inBurst) {
      this.silence += chunk.length;
      this.buf.push(chunk);
      if (this.silence >= this._burstGapSamples) this.endBurst();
    }
    if (this.buf.length >= this._maxBuf) this.endBurst();
  }

  endBurst() {
    if (!this.inBurst) return;
    this.inBurst = false;
    this.silence = 0;
    const merged = new Float32Array(this.buf.reduce((a, c) => a + c.length, 0));
    let o = 0;
    for (const c of this.buf) {
      merged.set(c, o);
      o += c.length;
    }
    this.buf = [];
    const frames = decodeBurst(merged, this.p, this.sr);
    this.stats.bursts++;
    this.stats.packets += frames.length;
    if (this.onPacket) for (const f of frames) this.onPacket(f);
  }
}
