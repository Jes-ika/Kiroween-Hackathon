// Protocol-level tests: CRC known-answer, packet structure, envelope round-trip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc16, buildPacket, envelope, textToPayload, payloadToText, fnv1a, GW1 } from '../js/protocol.js';

test('crc16 matches the CCITT-FALSE known answer', () => {
  // "123456789" -> 0x29B1 is the canonical CCITT-FALSE check value
  assert.equal(crc16(new TextEncoder().encode('123456789')), 0x29b1);
});

test('buildPacket emits [preamble x6][0x7E][LEN][payload][CRC hi][CRC lo]', () => {
  const payload = textToPayload('GHOSTS');
  const pkt = buildPacket(payload);
  const expectedLen = GW1.preambleCount + 1 + 1 + payload.length + 2;
  assert.equal(pkt.length, expectedLen);

  for (let i = 0; i < GW1.preambleCount; i++) assert.equal(pkt[i], 0x55);
  assert.equal(pkt[GW1.preambleCount], GW1.sync);
  assert.equal(pkt[GW1.preambleCount + 1], payload.length);

  const data = pkt.subarray(GW1.preambleCount + 1, GW1.preambleCount + 1 + 1 + payload.length);
  const crc = crc16(data);
  assert.equal(pkt[pkt.length - 2], (crc >> 8) & 0xff);
  assert.equal(pkt[pkt.length - 1], crc & 0xff);
});

test('buildPacket rejects oversized payloads loudly', () => {
  assert.throws(() => buildPacket(new Uint8Array(GW1.maxPayload + 1)));
});

test('envelope JSON survives encode/decode and keeps relay fields', () => {
  const env = envelope('CASPER', 'BANSHEE', 2, 'NEED WATER', 1763900000);
  const bytes = textToPayload(env);
  assert.ok(bytes.length <= GW1.maxPayload, 'typical SOS envelope must fit GW-1');
  const back = JSON.parse(payloadToText(bytes));
  assert.deepEqual(back, { f: 'CASPER', t: 'BANSHEE', ttl: 2, m: 'NEED WATER', ts: 1763900000 });
});

test('fnv1a is stable and order-sensitive', () => {
  const a = fnv1a(textToPayload('boo'));
  assert.equal(a, fnv1a(textToPayload('boo')));
  assert.notEqual(a, fnv1a(textToPayload('obO')));
});
