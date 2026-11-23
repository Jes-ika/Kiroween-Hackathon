# Bonus prize copy — ready to publish

## 1. Social Blitz (#KiroweenHackathon26)

Rules: post during the Submission Period, hashtag at the BEGINNING of the
post, share your favorite thing about Kiro and how it changed your approach,
add the post URL to the Devpost form. Pick one variant (or post two on
different platforms — any platform counts, one URL required).

### Variant A (X/Twitter, LinkedIn — story-led)

#KiroweenHackathon26 My favorite thing about Kiro? It made me write the
requirements BEFORE the code — EARS-format specs in .kiro/specs — and then
hold me to them. For Ghostwire (a 1962 acoustic modem resurrected as a
network-free disaster messenger), spec-driven development caught a
clock-drift bug that only showed up on long frames, and a hook re-runs the
property-based test suite on every save. I stopped "vibe coding" and started
engineering with an AI partner that reads the spec first. When the towers
fall, Ghostwire speaks: text over sound, zero servers. 🎃👻
[gif/screenshot: oscilloscope + echo log lines]

### Variant B (short, punchy)

#KiroweenHackathon26 Kiro turned me from prompting into specifying. Wrote
the EARS spec first → the spec caught my modem lying about the CRC → hooks
now run 15 property tests on every save. Ghostwire: text travels as SOUND,
device to device, no network. Dead 1962 tech, alive again. 👻
[screenshot: SELF-TEST PASSED + echoes deduped]

### Variant C (dev-community angle, Reddit-adjacent tone)

#KiroweenHackathon26 — building a browser-native FSK modem with Kiro taught
me the wildest lesson: my Node test suite was green while the browser
decoder "decoded silence." Reason: ScriptProcessorNode reuses its buffer
memory between callbacks, and my streaming decoder kept views instead of
copies. Found it with a pipeline-introspection page, fixed it with chunk
snapshots, and locked it in with a new property-based regression test.
Kiro's spec + hooks workflow is the reason the fix went through the suite
instead of straight to main. Favorite thing: hooks that make red tests
impossible to miss.

## 2. Bonus Blog Prize (public third-party blog, during Submission Period)

Title: "I resurrected a 1962 modem for a hackathon — and my AI made me
write the spec first"

Skeleton (draft in docs/, publish on dev.to / Medium / Hashnode):
1. Hook: disasters kill networks first (Maria ~90% of cell sites, weeks).
   The acoustic coupler solved "no infrastructure" in 1962. It's time to
   bring it back.
2. The resurrection: GW-1 — 1200/2200 Hz FSK at 600 baud in a browser tab;
   preamble clock recovery; CRC-16 gate; relay inbox with TTL.
3. The Kiro part (this is what the prize reads for):
   - Spec-driven development: EARS requirements (.kiro/specs/acoustic-protocol)
     written before the decoder; "never render an unverified frame" shaped the
     whole architecture.
   - PBT: how the median-clock bug appeared ONLY on long frames; how the
     corruption test had to become realistic; seeded mulberry32 for
     reproducibility.
   - Hooks: codec-tests-on-save, submission-gate (a hook that guards the
     hackathon's own rules — .kiro must never be gitignored).
   - Steering docs: the Windows/Git-Bash quirk written down once so no
     session re-discovers it.
   - The browser-only aliasing bug: Node tests green, browser decoding
     silence; ScriptProcessor memory reuse; debug.html pipeline forensics;
     new PBT regression.
4. Close: what "spec-first with AI" changed about how I build — the spec is
   the contract; the AI is the junior dev who reads it carefully.
   Mention explicitly: "written as part of the Kiroween 2026 hackathon."

## 3. Devpost write-up pointer
docs/kiro-writeup.md holds the long-form answers; paste + trim for the
"how Kiro was used" field, and link this blog + the social post URLs.
