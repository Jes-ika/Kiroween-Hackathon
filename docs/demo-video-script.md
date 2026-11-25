# GHOSTWIRE — Demo Video Script v2 (target: 2:30, hard cap 3:00)

> Structure follows the golden rule: the impossible moment FIRST, explanation
> second, Kiro lifecycle third, vision last. No slides. Every scene maps to a
> judging pillar shown in [brackets].

## 0:00–0:15 — THE COLD OPEN (two real devices, airplane mode) [Presentation]
- VISUAL: two phones on a table. CLOSE-UP: phone A's control center shows
  AIRPLANE MODE ON, Wi-Fi off. Phone B: mic open on the Ghostwire page.
  Press **NEED MEDICAL** on phone A → the burst chirps → phone B's log
  materializes the red line `«BANSHEE» → ALL: NEED MEDICAL` and the TRIAGE
  strip flips red: `TRIAGE — MED 1 · …`.
- NARRATION (over the shot, calm): "Two phones. Airplane mode. No tower,
  no Wi-Fi, no server — and the message still arrives."

## 0:15–0:45 — The resurrection explained [Innovation, Impact]
- VISUAL: back to the laptop console; GUIDED SÉANCE running; LIVE WIRE
  oscilloscope showing the FSK waveform; footer stats visible.
- NARRATION: "This is Ghostwire — the séance protocol for dead zones. We
  resurrected the 1962 acoustic modem: text rides 1200 and 2200 hertz tones
  at 600 baud, speaker to microphone, exactly like the dial-up pioneers.
  No infrastructure to install, nothing to subscribe to. It's the last-gasp
  layer for when the towers are down and the people who matter are across
  the room — or through a wall."

## 0:45–1:20 — Honest engineering [Implementation]
- VISUAL: RUN SELF-TEST → PASSED. Split screen of .kiro/specs EARS file and
  the decoder pipeline code. Test terminal: 21 passing; show the property
  names scroll by (round-trip, noise, clock mismatch, corruption rejected).
- NARRATION: "In a crisis, a hallucinated message can cost a life. So there
  is ZERO AI in the transport — pure deterministic DSP with a CRC-16 gate.
  A corrupted frame is dropped, never rendered. The decoder rebuilds the bit
  clock from the preamble — that's how a 48-kilohertz laptop talks to a
  44.1-kilohertz phone. Twenty-one property-based tests throw noise, clock
  skew and corruption at the modem; the suite stays green or the build stops."

## 1:20–2:00 — The Kiro lifecycle [Implementation — the heaviest pillar]
- VISUAL (screen recording, tight cuts):
  1. .kiro/specs/acoustic-protocol/requirements.md (EARS lines) →
  2. edit codec.js → hook fires, tests re-run on save →
  3. the war story slide: PBT caught the clock-drift bug; debug.html
     forensics caught the browser-only buffer-aliasing bug; regression PBT
     added →
  4. steering docs flash →
  5. Kiro CLI: the triage-officer agent runs `node tools/triage.mjs` on a
     live session export and prints the incident briefing.
- NARRATION: "Every line was born in Kiro. EARS requirements before code.
  Hooks re-run the property suite on every save of signal math. Property
  tests caught a clock-drift bug that only killed long frames — and a
  browser-only buffer-aliasing bug that made our decoder listen to silence.
  And when the modem receives traffic, the triage-officer — our Kiro crew
  agent — turns the transcript into a prioritized incident briefing.
  Medical first. Always."

## 2:00–2:30 — The radio room + vision close [Design, Impact, Presentation]
- VISUAL: the console up close — TRIAGE strip red on MEDICAL, EXPORT
  TRANSCRIPT click → terminal briefing appears. End on two devices in a
  dark room, the CRT glow, then the boot overlay tagline.
- NARRATION: "Receiving is not responding. The radio room triages what the
  wire collects — and every device on the network relays for its neighbors,
  so whispers hop across rooms no single radio could cover. You don't
  install Ghostwire. You open a tab. When the towers fall, Ghostwire
  speaks."

## Shot/fact checklist before recording
- [ ] Two-phone airplane-mode cold open rehearsed (this shot makes or breaks it)
- [ ] Phone volume ~80%, laptop mic sensitivity checked, quiet room
- [ ] 3-device relay chain (fallback: relay log line + stats "carried N")
- [ ] Terminal font ≥ 125% zoom, 1080p crop, no personal info in frame
- [ ] Voiceover recorded separately; ambient hum only, no copyrighted audio
- [ ] Runtime ≤ 2:45 after edits; captions burned in for muted autoplay
