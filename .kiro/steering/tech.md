# Technology: Ghostwire

## Stack

- **Vanilla ES modules, zero runtime dependencies.** The DSP must be readable
  by judges and hackable at 2 a.m. without npm archaeology.
- **Web Audio API** for transport (ScriptProcessorNode v0; AudioWorklet when
  we need lower latency — noted in specs, not before it hurts).
- **Node built-in test runner** (`node --test`) + hand-rolled seeded PRNG for
  property-based tests. No test framework deps until we actually need them.

## Signal plan (GW-1)

- AFSK: mark = 1200 Hz (bit 1), space = 2200 Hz (bit 0) — Bell 202 homage.
- 600 baud default; codec is parameterized, PBT sweeps 300–600.
- Framing: `[0x55 ×6][0x7E][LEN][payload][CRC16-CCITT]`, LSB-first bits.
- CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) over LEN+payload.
- Payload ≤ 128 bytes: a JSON envelope `{f, t, ttl, m, ts}`.

## DSP architecture rules

1. `js/codec.js` is **pure math** — no browser APIs, no DOM. It runs
   identically in Node tests and the browser. If you're tempted to touch
   `window` there, you're in the wrong file.
2. Browser glue lives in `js/audio.js` (transport) and `js/app.js` (UI/state).
3. All signal constants come from `DEFAULTS` in codec.js. No magic numbers in
   logic.
4. Decoder pipeline order is sacred: normalize → Goertzel grid → clock
   recovery (crossing chains, least-squares) → phase alignment → exact bit
   slicing → sync hunt → CRC gate. Changes here REQUIRE green PBT first.

## Testing doctrine (property-based)

- Round-trip property: arbitrary payload in ⇒ identical payload out, across
  44.1k/48k, across 300–600 baud.
- Robustness properties: noise to 10 dB SNR decodes; cross-device clock
  mismatch (48k↔44.1k) decodes; corrupted frames are REJECTED, never
  mis-rendered; silence decodes to nothing.
- Seeded PRNG (mulberry32) everywhere: a red test must reproduce exactly.

## Commands

- Test: `node --test "tests/*.test.js"`
- Run: `npx serve .` or `python -m http.server` (ES modules need http://, not file://)

## Windows note

The dev box is Windows/Git Bash: `node --test tests/` (directory form) fails —
always pass the glob.
