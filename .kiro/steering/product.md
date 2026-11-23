# Product: Ghostwire

## Why

When disasters knock out cell towers and internet (Hurricane Maria: ~90% of
cell sites offline for weeks; Helene/Milton 2024: 10–20%+ of sites down across
affected states), people resort to shouting names across parking lots.
Meanwhile the technology that solved "no infrastructure" in 1962 — the
acoustic modem — is treated as dead. Ghostwire resurrects it: any phone or
laptop becomes a modem that speaks text as sound through the air.

## Who it serves

1. People in disaster zones with no connectivity but working devices.
2. Communities in permanent dead zones (rural, mountainous, off-grid).
3. Anyone under network shutdowns or censorship who needs channel-free text.
4. Educators/hobbyists: a living, testable museum of how modems work.

## Principles

- **Zero infrastructure**: no servers, no accounts, no network permissions.
  If it has a speaker and a mic, it can carry a message.
- **Never fabricate**: a corrupted frame is dropped, never rendered as text.
  A wrong "I AM SAFE" is worse than silence. CRC gates every output.
- **Zero install**: one browser tab. The séance in-page loop lets a single
  device demonstrate the full transport with no second device and no mic.
- **Relay kindness**: every device is a store-and-forward post office.
  Messages for others hop through you (TTL-limited, de-duplicated).
- **The spooky is the serious**: the séance aesthetic is not decoration; it
  frames dead technology speaking again, and makes a technical demo
  emotionally memorable.

## Non-goals (v0)

- Voice calls, images, encryption (roadmap: version negotiation first).
- Long-range RF (LoRa etc.) — Ghostwire deliberately uses only what ships
  in every device: speaker + microphone.
