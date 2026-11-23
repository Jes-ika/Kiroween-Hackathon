# How Kiro Built Ghostwire (submission write-up draft)

> Status: living document. We update it as we use each Kiro capability so the
> final Devpost write-up is backed by artifacts in the repo, not memory.

## The short story

Ghostwire was built spec-first: the GW-1 wire protocol, decoder pipeline and
relay rules existed as EARS-format requirements and a design doc in
`.kiro/specs/` before the corresponding code. When a subtle DSP bug surfaced,
it wasn't a unit test that caught it — it was a property-based test written
against the spec, and the fix (least-squares clock recovery) went back through
the design doc first.

## Spec-driven development

- `.kiro/specs/acoustic-protocol/` — 9 EARS requirements ("WHEN noise reduces
  SNR to 10 dB, THE SYSTEM SHALL decode or discard — never render corrupted
  text"), a design doc with the full demodulation pipeline and rejected
  alternatives (NRZI/HDLC, OFDM ultrasonic), and a living task list.
- Impact vs vibe coding: the "never fabricate a frame" requirement forced the
  CRC-gated architecture BEFORE there was code to defend. Every later decision
  (retry ladder, dedupe, burst splitting) was checked against written
  requirements, not vibes.
- Honest evidence: PBT caught a median-clock drift failure that the design
  doc then had to explain (it now contains a "LESSON LEARNED" section). The
  spec evolved when reality disagreed with it.

## Property-based testing

- `tests/codec.pbt.test.js` — seeded mulberry32 PRNG, 8 properties: round-trip
  across sample rates, 10 dB SNR noise, 48k↔44.1k clock mismatch, ×3 relay
  floods, corruption rejection, silence honesty, baud sweep.
- What PBT caught that unit tests wouldn't: the median-based clock estimate
  failed ONLY on long frames (3-packet bursts, 300-baud) because tenths of a
  sample per bit compound over hundreds of bits. No human writes that unit
  case by hand; the property "arbitrary payload round-trips" found it in
  seconds.
- A second lesson: our first corruption test was too gentle (24 flipped
  samples averaged away by the Goertzel windows — the message legitimately
  survived). We replaced it with a realistic 60 ms noise blast. PBT taught us
  what corruption actually means to a modem.

## Agent hooks

- `codec-tests-on-save.kh` — any edit to `js/codec.js`, `js/protocol.js` or
  tests re-runs the full property suite. Signal math is the one place where a
  silent regression equals lying to disaster survivors; the hook makes red
  tests impossible to miss.
- `kiro-dir-guard.kh` — audits `.gitignore` on every change and asks the agent
  to verify `/.kiro` isn't ignored. Kiroween rules say a gitignored `.kiro`
  can disqualify the submission; we automated the paranoia.

## Custom agents

- `ghost-engineer` (`.kiro/agents/ghost-engineer.md`) — a DSP specialist with
  house rules: purity of codec.js (Node-runnable), seeded randomness only,
  "instrument the pipeline before theorizing." Used for all codec work;
  the debug-then-fix loop for the clock drift bug followed its discipline.

## Steering

- `product.md` pins the ethical spine: "a wrong I AM SAFE is worse than
  silence" — that line came back repeatedly when weighing FEC strategies.
- `tech.md` locks the stack (zero runtime deps), the signal plan, and the
  Windows/Git-Bash quirk (`node --test tests/` fails; use the glob) so no
  session re-discovers it.
- `structure.md` defines where new code goes and keeps envelope keys
  single-letter because they ride the air.

## MCP / Powers / Crew (planned next)

- MCP: filesystem + GitHub MCP for repo hygiene during the crunch; a
  web-search MCP for prior-art checks (quiet.js, Meshtastic, goTenna) that
  shaped our differentiation claims.
- Powers: testing/docs powers for the final week polish.
- Kiro Crew: a `triage-officer` crew app that watches the séance log and
  summarizes received SOS traffic is planned as the Best-Kiro-Crew-App add-on
  if time allows.

## What we'd tell a past self

Write the requirements as EARS clauses on day one — every architecture fight
after that is just re-reading your own spec.
