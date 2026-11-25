# Spec: Triage Officer (Kiro Crew app)

## Purpose

A séance network that receives SOS traffic needs someone in the radio room.
The triage-officer agent (Kiro Crew / IDE / CLI) ingests transcript exports
and produces prioritized incident briefings for responders.

## Requirements (EARS)

- WHEN a transcript export is provided, THE OFFICER SHALL produce a briefing
  that separates CRITICAL (medical/location) from ELEVATED (water) and
  STABLE (check-in) traffic.

- WHEN medical traffic exists in the transcript, THE OFFICER SHALL rank it
  at the top of the briefing regardless of recency.

- WHEN a message repeats (deduped echoes), THE OFFICER SHALL count the
  repeats as corroboration, not as separate incidents.

- WHEN a whisper faded (no hops left) or a frame was corrupted, THE OFFICER
  SHALL list it as UNRESOLVED and never guess its content.

- WHEN the transcript contains no distress traffic, THE OFFICER SHALL report
  a calm network state rather than inventing incidents.

## Design

- `js/triage-core.js` — the pure briefing engine, imported by THREE
  consumers so the loop is continuous: the live console (TRIAGE strip
  updates the moment a packet decodes), the crew CLI (`tools/triage.mjs`,
  stdin/file/`--json`), and the tests.
- The console's EXPORT TRANSCRIPT button hands the raw log to the officer —
  acoustic decode → live triage → briefing, no offline bolt-on.
- The agent orchestrates the tool and adds judgment on top: repeat
  patterns, silences, follow-up priorities. The tool never invents; the
  agent never fabricates.
- Priority model: MEDICAL 4 > LOCATION 3 > WATER 2 > CHECK-IN 1 > other 0.
- Output shapes: human briefing (default) and JSON (--json) for downstream
  crew automation.

## Tasks

- [x] 1. Parser tolerant to console-log line shapes (timestamps, «caller» →
      dest: text, ×N repeat suffixes, echo/relay/system lines)
- [x] 2. Priority classification + briefing text + JSON mode
- [x] 3. Sample transcript + unit tests (tests/triage.test.js)
- [x] 4. triage-officer agent definition (.kiro/agents/triage-officer.md)
- [ ] 5. Run the officer in Kiro IDE/CLI against a live session export;
      capture screenshots for the submission
- [ ] 6. Wire briefing output into the demo video (radio-room scene)
