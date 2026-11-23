# Design: GW-1 Acoustic Protocol

## Signal plan

| Parameter   | Value          | Rationale |
|-------------|----------------|-----------|
| mark (bit1) | 1200 Hz        | Bell 202 homage; survives cheap speakers |
| space (bit0)| 2200 Hz        | 1000 Hz separation >> consumer audio rolloff |
| baud        | 600            | 10 samples/bit @48k; fast enough for 1s messages |
| amplitude   | 0.8            | headroom for fade-in/out, avoids clipping |
| preamble    | 0x55 ×6        | alternating bits = clock railroad tracks |
| framing     | [0x7E][LEN][payload][CRC16] | hunt-and-verify; resync per byte |

## Modulation (encodePackets)

Phase-continuous sine accumulator (no clicks at bit edges); 2 ms raised-cosine
fades at burst edges; 60 ms gaps between repeated packets so the burst
splitter can separate them. Repetition ×3 is the v0 FEC strategy; the app
layer de-dupes by FNV-1a hash.

## Demodulation pipeline (decodeBurst)

1. **Normalize**: remove DC, scale by RMS (mic gain is unknowable).
2. **Tone grid**: sliding Goertzel power difference d(t) = P(1200) − P(2200)
   on a win/40-sample grid (coarse but cheap; exact Goertzel only at final
   boundaries). Goertzel chosen over FFT: one window, two frequencies,
   O(n·win) with no FFT framing overhead.
3. **Clock recovery**: sign-change crossings of d(t), sub-grid refined by
   linear interpolation; longest chain of ~1-bit-spaced crossings (the 0x55
   preamble dominates); **least-squares slope** = bit length. LESSON LEARNED
   (found by PBT): a median-based estimate drifts tenths of a sample per bit
   and compounds over hundreds of bits — long frames die at the CRC. Least
   squares over the whole chain stays exact.
4. **Retry ladder**: CRC-gated escalation of ±0.4%…±6% bit-length correction.
   Wrong guesses fail CRC cleanly, so retries are safe.
5. **Phase alignment**: boundary offset maximizing Σ|d| over the burst.
6. **Bit slicing**: exact Goertzel at each aligned boundary; bit = d>0.
7. **Sync hunt**: scan for 0x7E; read LEN (≤96 guard); verify CRC-16/CCITT
   over LEN+payload; only verified payloads escape; continue hunting for
   more frames in the same burst.

## Burst segmentation (Decoder)

Streaming class: chunks with RMS ≥ threshold (0.02) open/extend a burst;
≥50 ms of silence ends it and triggers decode. Repeated SOS packets are
separated by the encoder's 60 ms gaps.

## Trade-offs / rejected options

- **NRZI + HDLC bit stuffing** (APRS-style): rejected for v0 — stuffing bugs
  are classic; CRC + repetition achieves honesty with less machinery.
- **OFDM/ultrasonic** (quiet.js-style): higher throughput but brittle on
  cheap speakers; our goal is reliability + the audible séance aesthetic.
  Near-ultrasonic "whisper mode" is a roadmap task behind a capability probe.
- **JSON envelope** vs binary packing: JSON costs bytes but wins iteration
  speed for a hackathon; binary header is a roadmap task.
- **AudioWorklet**: ScriptProcessor is deprecated but universal; migrating
  only when jank is observed on real hardware.

## Property-based testing map

| Property                          | Test |
|-----------------------------------|------|
| round-trip, random payloads ×2 SRs| `codec.pbt.test.js` |
| full-size 96 B payloads           | idem |
| noise to 10 dB SNR                | idem |
| 48k↔44.1k clock mismatch          | idem |
| ×3 relay flood via Decoder        | idem |
| corruption rejected, never mis-rendered | idem |
| silence hallucination check       | idem |
| baud sweep 300/450/600            | idem |
