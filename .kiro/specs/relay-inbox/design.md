# Design: Relay Inbox

- Envelope: `{f: from, t: to|"ALL", ttl, m: text, ts}` (JSON, ≤96 B on air).
- Relay decision: `t !== me && t !== "ALL" && ttl > 0` → rebroadcast
  `{...env, ttl: ttl-1}` after a jittered backoff. Randomization prevents the
  "synchro-ghost" problem where every neighbor re-broadcasts simultaneously
  and all collisions land in the same instant.
- Dedupe: FNV-1a over the raw payload bytes; first copy wins, later copies
  counted as echoes. The sender pre-seeds its own payload hash so the séance
  loop never echoes its own whisper back into the transcript.
- Chain of custody: relayed messages keep the original sender field, so the
  log reads like a witness list, not a rewrite.
- v0 TTL = 2 hops, fixed. Roadmap: hop-count display per message, and a
  "medium" profile (ttl 4) for dense camps.

## Trade-offs

- Randomized backoff instead of CSMA: browsers give no carrier-sense access
  to the mic in real time without extra DSP; jitter + CRC + repetition is
  the honest cheap solution.
- No message store persistence: v0 is a live séance. Persistent outbox is a
  roadmap task (localStorage) once the 3-device chain demo is stable.
