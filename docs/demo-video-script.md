# GHOSTWIRE — Demo Video Script (target: 2:40, hard cap 3:00)

> Rules compliance: shows the project working on the device it was built for
> (browser on laptop + phone), no copyrighted music, public on YouTube.
> Every shot maps to a judging pillar shown in [brackets].

## Shot list

### 0:00–0:12 — The hook [Presentation, Impact]
- VISUAL: black screen, one line of green phosphor text types itself:
  "When the towers fall, how do you say I AM SAFE?"
- Cut to the GHOSTWIRE boot overlay, cursor blinking.
- NARRATION (calm, eerie): "Hurricane Maria. Ninety percent of cell towers,
  offline for weeks. Every survivor held a device with a speaker and a
  microphone — and the one technology ever built to speak through them had
  been dead since 1962. We resurrected it."

### 0:12–0:35 — What it is [Innovation]
- VISUAL: live site on laptop (https://jes-ika.github.io/Kiroween-Hackathon/),
  press BEGIN THE SÉANCE. Show the console.
- NARRATION: "This is Ghostwire — the séance protocol for dead zones. Text
  rides 1200 and 2200 hertz tones, speaker to microphone, device to device.
  No cell network. No internet. No servers. The sound in the room IS the
  network layer."

### 0:35–1:00 — Proof of life [Implementation]
- VISUAL: click RUN SELF-TEST → "SELF-TEST PASSED in N ms". Then hover the
  LIVE WIRE oscilloscope while a message is sent — the FSK waveform visibly
  speaks. Point cursor at the spectrum.
- NARRATION: "Every message becomes a GW-1 packet: preamble, sync, length,
  payload, CRC-16. The decoder rebuilds the bit clock from the preamble's
  transitions — which is how a 48-kilohertz laptop talks to a 44.1-kilohertz
  phone. And if the checksum breaks, the message is never shown. A modem
  that fabricates 'I AM SAFE' is worse than silence."

### 1:00–1:45 — Real air, two devices [Presentation, Design]
- VISUAL (hero shot): phone propped next to laptop. Laptop: speak out loud.
  Phone: open the mic. Send a whisper on the laptop; the phone log shows it
  materialize. Flip direction. Then send NEED MEDICAL ×3 — red pulse in log.
- NARRATION: "Two devices, one room, zero infrastructure. The séance loop
  also lets a single device demonstrate the entire transport — but this is
  the real thing: electromagnetic silence, pure acoustics. SOS presets
  broadcast three times; every frame is verified; duplicates dissolve."

### 1:45–2:15 — The haunted post office [Impact, Implementation]
- VISUAL (if 3rd device available): three devices in a line — A and C too
  far apart, B in between. A sends to C; B's log shows "carrying whisper…
  ttl 2→1"; C receives. If no 3rd device: show the relay code path + stats
  line "carried N".
- NARRATION: "Every Ghostwire device is a store-and-forward post office.
  Messages meant for someone out of earshot hop through neighbors —
  TTL-limited, jitter-timed to avoid collisions, deduplicated by hash.
  The 1980s BBS mailbox, reborn without a server."

### 2:15–2:40 — How Kiro built it + close [Implementation, Presentation]
- VISUAL: quick screen pass of the repo: .kiro/specs (EARS requirements),
  the hook firing the PBT suite on save, tests terminal: "15 pass", the
  write-up doc. End on the boot overlay.
- NARRATION: "Ghostwire was built spec-first in Kiro: EARS requirements
  before code, property-based tests that caught a clock-drift bug and a
  browser-only buffer-aliasing bug no unit test would ever find, hooks that
  re-run the suite on every save, and steering docs that keep the ethics
  honest: never render an unverified frame. When the network dies,
  Ghostwire speaks. 🎃"

## Shot/fact checklist before recording
- [ ] Phone + laptop real-air demo rehearsed (distances: 30cm, then 1m)
- [ ] 3-device relay chain OR fallback shown above
- [ ] Terminal sized readable (1080p crop), font zoom 125%+
- [ ] No copyrighted audio; narration over ambient hum only
- [ ] Total runtime ≤ 2:50 after edits
