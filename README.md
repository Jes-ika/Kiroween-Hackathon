# 👻 GHOSTWIRE — the séance protocol for dead zones

> When the towers fall, your voice still travels — as sound.

**Category: Resurrection** — we resurrected the 1962 acoustic modem
(Bell 103/202 heritage) and rebirthed it as a zero-install, zero-server,
disaster-resilient messaging network that runs in any browser tab.

## The problem

Disasters kill networks before anything else. Hurricane Maria left ~90% of
cell sites offline for weeks; Hurricanes Helene and Milton (2024) knocked
10–20%+ of sites down across whole states. In those hours, the technology
that once solved "no infrastructure" — the acoustic modem, the BBS mailbox,
the packet-radio hop — is treated as dead. Meanwhile every survivor is
holding a device with a speaker and a microphone.

## The resurrection

**Ghostwire turns those speakers and mics into a text network.**

- **GW-1 protocol**: your message rides 1200 Hz / 2200 Hz FSK tones at
  600 baud through the air — speaker to microphone, device to device.
- **No network, ever**: no servers, no accounts, no connectivity. The
  physical sound in the room IS the network layer.
- **Haunted post office**: every device relays others' messages (TTL-limited
  store-and-forward with collision-avoiding jitter) — the 1980s BBS mailbox
  concept, reborn.
- **Never fabricates**: every frame is CRC-16 verified. Corrupted whispers
  dissolve; the modem is incapable of inventing text.
- **The séance in-page loop**: one device can demonstrate the full real-time
  acoustic transport with no second device and no microphone.
- **SOS presets**: I AM SAFE / NEED MEDICAL / NEED WATER / COME TO ME, each
  broadcast ×3 for redundancy.

And it's wrapped in a haunted-CRT séance console, because dead tech speaking
again *should* feel supernatural.

## Run it

**Or skip the clone:** the app is live at
**https://jes-ika.github.io/Kiroween-Hackathon/** (GitHub Pages, HTTPS).

```bash
# any static server works (ES modules need http://, not file://)
npx serve .
# or
python -m http.server 5173
```

Open it and press **BEGIN THE SÉANCE** — or **GUIDED SÉANCE**, a narrated
30-second auto-demo. Then:

1. **RUN SELF-TEST** — proves the full encode→decode path in pure math.
2. Watch the **LIVE WIRE** oscilloscope — the actual FSK waveform as it
   speaks and listens.
3. Type a whisper and **SEND** — with the *séance loop* on, the page speaks
   the FSK burst aloud and decodes it live through the Web Audio graph.
4. **Two-device séance**: open Ghostwire on two devices, check *speak out
   loud* on one and *open the mic* on the other. Hold them close. The
   message travels through the AIR. (Mic needs HTTPS or localhost — the
   séance loop works everywhere.)

### Tests (Node ≥ 18, zero dependencies)

```bash
node --test "tests/*.test.js"
```

14 passing tests, including **property-based tests** with seeded randomness:

| Property | Guaranteed |
|---|---|
| Round-trip | arbitrary payloads survive encode→decode (44.1k & 48k) |
| Noise | decodes at 10 dB SNR or stays silent |
| Cross-device clocks | 48k↔44.1k DAC mismatch recovers via preamble clock fit |
| Relay flood | ×3 repeats yield 3 CRC-valid packets |
| Honesty | corrupted frames are dropped, NEVER mis-rendered |
| No hallucinations | silence decodes to nothing |

## Architecture

```
js/protocol.js   GW-1 framing · CRC-16/CCITT · envelopes · FNV-1a dedupe
js/codec.js      PURE DSP (runs in Node tests AND browser):
                 normalize → Goertzel tone grid → clock recovery (least-
                 squares over preamble crossings) → phase alignment →
                 exact bit slicing → sync hunt → CRC gate
js/audio.js      Web Audio transport: speakers, séance loop, mic
js/app.js        séance console: relay inbox, SOS presets, self-test
```

The codec is deliberately browser-free — the exact math that flies through
your room is the math the test suite hammers with noise, clock skew and
corruption.

## How Kiro built this

Full write-up: [docs/kiro-writeup.md](docs/kiro-writeup.md). Short version:

- **Spec-driven development**: `.kiro/specs/acoustic-protocol/` (EARS-format
  requirements → design → tasks) was written first; the decoder pipeline in
  code mirrors the design doc step for step.
- **Property-based testing discipline**: PBT caught a real, subtle failure —
  a median-based clock estimate that compounds drift over long frames —
  which unit tests would never have written a case for.
- **Agent hooks**: `codec-tests-on-save` re-runs the property suite whenever
  signal math changes; `kiro-dir-guard` audits `.gitignore` so the required
  `/.kiro` folder can never be silently excluded (a disqualification risk).
- **Custom agent**: `ghost-engineer` (.kiro/agents/) — a DSP specialist with
  house rules like "a modem that fabricates text is a liability".
- **Steering**: product/tech/structure docs keep the séance tone, the
  pure-DSP architecture, and the Windows/Git-Bash quirks consistent.

## Roadmap

- [ ] Whisper mode (near-ultrasonic, ~17 kHz) behind a capability probe
- [ ] Message persistence (outbox survives reload)
- [ ] 3-device relay chain demo (A → B → C)
- [ ] AudioWorklet migration if ScriptProcessor jank shows up on real hardware
- [ ] v2 binary envelope (more text per burst)

## License

MIT — see [LICENSE](LICENSE).
