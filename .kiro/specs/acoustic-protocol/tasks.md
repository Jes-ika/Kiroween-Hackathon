# Tasks: GW-1 Acoustic Protocol

- [x] 1. Protocol layer: CRC-16/CCITT (known-answer 0x29B1), packet builder,
      envelope helpers, callsign pool
- [x] 2. Encoder: phase-continuous AFSK, preamble/sync framing, gaps, fades
- [x] 3. PBT: seeded round-trip over random payloads × 44.1k/48k
- [x] 4. Decoder core: DC removal, normalization, Goertzel tone grid
- [x] 5. Clock recovery v1 (median of crossing intervals) — PBT caught
      long-frame drift; lesson recorded in design.md
- [x] 6. Clock recovery v2: sub-grid interpolation + longest-chain
      least-squares slope + CRC-gated retry ladder
- [x] 7. Sync hunt with LEN guard + CRC gate; multi-frame per burst
- [x] 8. Streaming Decoder: burst segmentation on 50 ms silence
- [x] 9. PBT: noise to 10 dB SNR; 48k↔44.1k mismatch; ×3 flood; corruption
      rejection; silence honesty; baud sweep
- [x] 10. Browser transport: GhostAudio (speakers gate, séance MediaStream
      loop, mic via getUserMedia with EC/NS/AGC off)
- [x] 11. Self-test ritual: encode→decode without audio hardware
- [ ] 12. Two-device acoustic field test on real laptops/phones (needs humans
      in a room — scheduled)
- [ ] 13. Tune threshold/AGC behavior from field-test findings
- [ ] 14. Near-ultrasonic "whisper mode" behind a capability probe
- [ ] 15. AudioWorklet migration if ScriptProcessor jank appears
