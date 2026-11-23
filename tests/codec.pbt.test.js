// Property-based tests (PBT) for the GW-1 acoustic codec.
//
// These are the tests unit tests can't write: instead of one hand-picked
// example, we throw dozens of seeded-random payloads, sample rates, noise
// levels and cross-device clock mismatches at the modem and demand it either
// deliver the message intact or stay silent. A modem that fabricates text is
// a liability in a disaster, so "never emit a corrupted frame" is a hard
// property, not a wish.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodePackets, decodeBurst, Decoder, DEFAULTS } from '../js/codec.js';
import { textToPayload, payloadToText, GW1 } from '../js/protocol.js';

// mulberry32 — seeded PRNG so a red test is a reproducible test
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomPayload(rng) {
  const len = 3 + Math.floor(rng() * (GW1.maxPayload - 2));
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    // printable ASCII + occasional newline, like real message text
    const r = rng();
    bytes[i] = r < 0.05 ? 0x0a : 0x20 + Math.floor(rng() * 0x5f);
  }
  return bytes;
}

function addNoise(samples, snrDb, rng) {
  // gaussian noise via Box-Muller, scaled so signal_rms/noise_rms = snr
  let sig = 0;
  for (let i = 0; i < samples.length; i++) sig += samples[i] * samples[i];
  sig = Math.sqrt(sig / samples.length);
  const noiseAmp = sig / Math.pow(10, snrDb / 20);
  const out = new Float32Array(samples.length);
  let spare = null;
  for (let i = 0; i < samples.length; i++) {
    let g = spare;
    if (g === null) {
      let u = 0, v = 0;
      while (u === 0) u = rng();
      while (v === 0) v = rng();
      const m = Math.sqrt(-2 * Math.log(u));
      g = m * Math.cos(2 * Math.PI * v);
      spare = m * Math.sin(2 * Math.PI * v);
    } else {
      spare = null;
    }
    out[i] = samples[i] + noiseAmp * g;
  }
  return out;
}

const SR = [48000, 44100];

test('PBT: arbitrary payloads round-trip through the acoustic codec', () => {
  const rng = mulberry32(0x600df00d);
  for (let i = 0; i < 24; i++) {
    const payload = randomPayload(rng);
    const sr = SR[i % SR.length];
    const samples = encodePackets([payload], {}, sr);
    const decoded = decodeBurst(samples, {}, sr);
    assert.equal(decoded.length, 1, `case ${i}: expected exactly 1 frame`);
    assert.deepEqual([...decoded[0]], [...payload], `case ${i}: payload mangled`);
  }
});

test('PBT: full-size 96B payloads survive the trip', () => {
  const rng = mulberry32(0xbeef);
  for (let i = 0; i < 4; i++) {
    const payload = new Uint8Array(GW1.maxPayload);
    for (let j = 0; j < payload.length; j++) payload[j] = 0x21 + Math.floor(rng() * 0x5b);
    const sr = SR[i % SR.length];
    const decoded = decodeBurst(encodePackets([payload], {}, sr), {}, sr);
    assert.equal(decoded.length, 1);
    assert.deepEqual([...decoded[0]], [...payload]);
  }
});

test('PBT: decode survives white noise down to 10 dB SNR', () => {
  const rng = mulberry32(0x51ee);
  for (const snr of [20, 14, 10]) {
    const payload = textToPayload('THE TOWER IS DOWN. WE ARE SAFE. - WRAITH');
    const samples = encodePackets([payload], {}, 48000);
    const noisy = addNoise(samples, snr, rng);
    const decoded = decodeBurst(noisy, {}, 48000);
    assert.equal(decoded.length, 1, `snr ${snr}: no frame decoded`);
    assert.deepEqual([...decoded[0]], [...payload], `snr ${snr}: payload mangled`);
  }
});

test('PBT: cross-device clock mismatch (48k encoder -> 44.1k decoder) recovers', () => {
  const rng = mulberry32(0xc10c);
  for (let i = 0; i < 4; i++) {
    const payload = randomPayload(rng);
    // Real phones/laptops disagree by ~8.8%: samples were born at one rate,
    // the decoder assumes another. Preamble clock recovery must absorb it.
    const decoded = decodeBurst(encodePackets([payload], {}, 48000), {}, 44100);
    assert.equal(decoded.length, 1, '48k->44.1k: no frame decoded');
    assert.deepEqual([...decoded[0]], [...payload]);
    const back = decodeBurst(encodePackets([payload], {}, 44100), {}, 48000);
    assert.equal(back.length, 1, '44.1k->48k: no frame decoded');
    assert.deepEqual([...back[0]], [...payload]);
  }
});

test('relay flood: three repeats decode as three packets via the streaming Decoder', () => {
  const rng = mulberry32(0x1234);
  const payload = textToPayload('SOS: NEED MEDICAL AT THE CHURCH');
  const samples = encodePackets([payload, payload, payload], {}, 48000);
  const got = [];
  const dec = new Decoder({}, 48000, (pkt) => got.push([...pkt]));
  // feed in 4096-sample chunks like ScriptProcessorNode does
  for (let o = 0; o < samples.length; o += 4096) {
    dec.feed(samples.subarray(o, Math.min(o + 4096, samples.length)));
  }
  dec.endBurst();
  assert.equal(got.length, 3, `expected 3 packets, got ${got.length}`);
  for (const g of got) assert.deepEqual(g, [...payload]);
});

test('corrupted frames are rejected, never mis-rendered', () => {
  const rng = mulberry32(0xfa1afe1);
  for (let i = 0; i < 8; i++) {
    const payload = randomPayload(rng);
    const samples = encodePackets([payload], {}, 48000);
    // blast a 60ms patch of signal-level noise over the data region —
    // a door slam garbling ~36 bits. The CRC gate must reject the frame.
    const wrecked = Float32Array.from(samples);
    const idx = Math.floor(samples.length * 0.35);
    const blast = Math.round(48000 * 0.06);
    let spare = null;
    for (let j = 0; j < blast && idx + j < wrecked.length; j++) {
      let u = 0, v = 0;
      while (u === 0) u = rng();
      while (v === 0) v = rng();
      const m = Math.sqrt(-2 * Math.log(u));
      spare = m * Math.sin(2 * Math.PI * v);
      wrecked[idx + j] = 0.8 * m * Math.cos(2 * Math.PI * v) + 0.2 * spare;
    }
    const decoded = decodeBurst(wrecked, {}, 48000);
    for (const frame of decoded) {
      assert.notDeepEqual([...frame], [...payload], 'decoder emitted a fabricated frame');
    }
  }
});

test('silence yields nothing (no ghost hallucinations)', () => {
  const quiet = new Float32Array(48000);
  const rng = mulberry32(7);
  const noisy = addNoise(quiet, 20, rng);
  assert.deepEqual(decodeBurst(noisy, {}, 48000), []);
});

test('settings honor overrides (baud sweeps still round-trip)', () => {
  const rng = mulberry32(0xbaad600);
  for (const baud of [300, 450, 600]) {
    const payload = textToPayload('ghosts of 300 baud, hear us');
    const decoded = decodeBurst(encodePackets([payload], { baud }, 48000), { baud }, 48000);
    assert.equal(decoded.length, 1, `baud ${baud}: no frame decoded`);
    assert.deepEqual([...decoded[0]], [...payload]);
  }
});

test('DEFAULTS expose the Bell-202-honoring signal plan', () => {
  assert.equal(DEFAULTS.markFreq, 1200);
  assert.equal(DEFAULTS.spaceFreq, 2200);
  assert.equal(DEFAULTS.baud, 600);
});
