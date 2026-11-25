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

## Positioning: zero AI in the transport, by design

A cynical judge should hear this clearly: the modem contains **no LLM and no
probabilistic component whatsoever**. In a crisis, a hallucinated message can
cost a life, so the transport is pure deterministic DSP behind a CRC-16 gate —
it can stay silent, but it can never invent text. AI enters exactly one place:
the **triage chair**, where the crew agent assists human judgment on
already-verified traffic. That split is an architectural safety decision, and
the EARS spec for the acoustic protocol forbids rendering unverified frames.

## Development timeline (all within the submission window; see git log)

- **Day 1** — EARS specs for the acoustic protocol + relay inbox written in
  Kiro BEFORE the decoder existed; protocol layer + CRC known-answer test.
- **Day 1–2** — encoder, decoder core; PBT caught the median-clock drift bug
  (long frames died at the CRC); fix went through design.md ("LESSON
  LEARNED") before the code; retry ladder added.
- **Day 2** — browser transport + séance console; first real-machine test
  exposed the séance-loop silence (MediaStream roundtrip) → replaced with a
  direct in-graph tap.
- **Day 3** — live-judge evidence: SELF-TEST threw a byte-budget error
  silently; envelope overhead vs 96-byte wire audited → budget fixed, error
  surfaced, textarea cap matched to the wire.
- **Day 3** — localhost pipeline forensics (`debug.html`) uncovered the
  browser-only ScriptProcessor buffer-aliasing bug (Node tests were green;
  the browser decoded overwritten silence); fixed with per-chunk snapshots +
  fine clock ladder + a new regression PBT. Echo decode verified end-to-end
  on the live site.
- **Day 4 (post-audit)** — external red-team review: positioned the project
  as the Last-Gasp Zero-Hop Protocol, added voice control / wake lock /
  128-byte payloads / live TRIAGE strip / transcript export (continuous
  modem→officer loop), restructured the video around a two-phone
  airplane-mode cold open.

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
  case by hand; the property "arbitrary payload round-trip" found it in
  seconds.
- A second lesson: our first corruption test was too gentle (24 flipped
  samples averaged away by the Goertzel windows — the message legitimately
  survived). We replaced it with a realistic 60 ms noise blast. PBT taught us
  what corruption actually means to a modem.
- A third lesson (browser-only, invisible to Node): ScriptProcessorNode
  reuses its inputBuffer memory between callbacks — our Decoder stored the
  views and decoded overwritten silence. Diagnosed with a localhost
  pipeline-introspection page (`debug.html`), fixed with per-chunk
  snapshots, and locked in with a new PBT ("bursts embedded in a realtime
  capture layout decode"). Realtime paths need their own regression
  properties, not just synthetic ones.

## Agent hooks

Four hooks, each tied to a real failure mode we hit or feared:

- `codec-tests-on-save.kh` — any edit to `js/codec.js`, `js/protocol.js` or
  tests re-runs the full property suite. Signal math is the one place where a
  silent regression equals lying to disaster survivors; the hook makes red
  tests impossible to miss.
- `syntax-gate-on-save.kh` — `node --check` across every js module on save;
  catches syntax breaks before tests even run.
- `submission-gate.kh` (manual trigger) — the pre-push ritual: PBT suite +
  syntax sweep + verifies LICENSE and `.kiro/specs|hooks|steering` exist.
  A missing artifact or gitignored `.kiro` can disqualify the submission;
  the gate makes that failure impossible to ship.
- `kiro-dir-guard.kh` — audits `.gitignore` on every change and asks the agent
  to verify `/.kiro` isn't ignored.

## Custom agents

- `ghost-engineer` (`.kiro/agents/ghost-engineer.md`) — a DSP specialist with
  house rules: purity of codec.js (Node-runnable), seeded randomness only,
  "instrument the pipeline before theorizing." Used for all codec work;
  the debug-then-fix loop for the clock drift bug followed its discipline.
- `field-tester` (`.kiro/agents/field-tester.md`) — owns the real-air test
  matrix (device/distance/noise), enforces "no tuning from a single anecdote,"
  and converts sessions into spec tasks.

## Steering

- `product.md` pins the ethical spine: "a wrong I AM SAFE is worse than
  silence" — that line came back repeatedly when weighing FEC strategies.
- `tech.md` locks the stack (zero runtime deps), the signal plan, and the
  Windows/Git-Bash quirk (`node --test tests/` fails; use the glob) so no
  session re-discovers it.
- `structure.md` defines where new code goes and keeps envelope keys
  single-letter because they ride the air.

## MCP

- `.kiro/settings/mcp.json` configures the GitHub MCP server
  (`@modelcontextprotocol/server-github`, token via `GITHUB_PERSONAL_ACCESS_TOKEN`
  env var — no secrets in the repo). Enabled it is used for repo hygiene during
  the crunch: release pushes, Pages/Devpost URL checks, issue tracking for
  field-test findings.

## Multi-surface evidence checklist (what we ran, where)

- [x] Kiro IDE — spec authoring (EARS requirements → design → tasks) and all
      `.kiro` artifacts; hooks fire on save inside the IDE.
- [x] Kiro CLI — test runs (`node --test`) and the submission-gate ritual
      before pushes.
- [ ] Kiro Web — research sessions (prior art: quiet.js, Meshtastic, goTenna,
      disaster outage reports) — capture transcript before submission.
- [ ] Kiro Crew — `triage-officer` crew app (watches the séance log,
      summarizes received SOS traffic) — stretch goal for Best Kiro Crew App.

## What we'd tell a past self

Write the requirements as EARS clauses on day one — every architecture fight
after that is just re-reading your own spec.
