// Ghostwire GW-1 — framing layer.
// A "packet" on the wire looks like:
//   [0x55 x PREAMBLE_COUNT] [0x7E] [LEN] [payload(LEN)] [CRC16 hi] [CRC16 lo]
// Preamble 0x55 is alternating bits (1,0,1,0...) — the receiver's clock
// recovery locks onto it, exactly like the sync tones of a 1962 Bell 103.

export const GW1 = {
  preamble: 0x55,
  preambleCount: 6,
  sync: 0x7e,
  maxPayload: 128, // bytes; JSON envelope overhead is ~56B, leaving ~72 chars of text
};

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF).
// Known answer: crc16("123456789") === 0x29B1.
export function crc16(bytes) {
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

// Wrap a payload (<= maxPayload bytes) into a full GW-1 packet.
export function buildPacket(payload) {
  const len = payload.length;
  if (len > GW1.maxPayload) {
    throw new Error(`payload ${len}B exceeds GW-1 max of ${GW1.maxPayload}B`);
  }
  const data = new Uint8Array(1 + len); // LEN byte + payload (this is what CRC covers)
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

// Message envelope helpers. The envelope is JSON on purpose (v0 trade-off:
// flexibility for the hackathon; binary packing is a design.md future task).
// Shape: { f: from-callsign, t: to-callsign | "ALL", ttl: hops-left, m: text, ts: unix-seconds }
export function envelope(from, to, ttl, text, ts) {
  return JSON.stringify({ f: from, t: to, ttl, m: text, ts });
}

export function textToPayload(text) {
  return new TextEncoder().encode(text);
}

export function payloadToText(bytes) {
  return new TextDecoder().decode(bytes);
}

// FNV-1a 32-bit — cheap dedupe key for relayed packets.
export function fnv1a(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export const GHOST_NAMES = [
  'CASPER', 'BANSHEE', 'WRAITH', 'POLTER', 'SPOOK', 'PHANTOM', 'SPECTER', 'GHAST',
];

export function randomCallsign(rng = Math.random) {
  return GHOST_NAMES[Math.floor(rng() * GHOST_NAMES.length)];
}
