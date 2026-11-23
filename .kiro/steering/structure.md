# Structure: Ghostwire

```
ghostwire/
├── index.html            # the séance console (single page)
├── styles.css            # CRT dressing: scanlines, flicker, glow
├── js/
│   ├── protocol.js       # GW-1 framing, CRC-16, envelopes, callsigns
│   ├── codec.js          # PURE DSP: FSK encode/decode, streaming Decoder
│   ├── audio.js          # Web Audio transport: speakers, séance loop, mic
│   └── app.js            # console state, relay inbox, SOS presets
├── tests/
│   ├── protocol.test.js  # CRC known-answer + framing structure
│   └── codec.pbt.test.js # property-based tests (the modem's conscience)
├── docs/
│   └── kiro-writeup.md   # submission write-up draft
├── .kiro/                # specs, hooks, steering, agents (SACRED — never gitignore)
├── LICENSE               # MIT
└── README.md
```

## Where things go

- New signal math → `js/codec.js` (pure), with a PBT in `tests/`.
- New user-facing behavior → `js/app.js`; new transport capability → `js/audio.js`.
- New on-the-wire rules (e.g., a v2 header) → a NEW spec folder in
  `.kiro/specs/<feature>/` BEFORE the code.
- UI text tone: séance-flavored but operationally clear ("NEED MEDICAL" is
  never a joke).

## Conventions

- Log line types: sys / sent / heard / relay / sos / warn / test.
- Envelope JSON keys stay single-letter (`f,t,ttl,m,ts`) — they ride the air.
- `node --test "tests/*.test.js"` must be green before any commit that touches
  js/ or tests/ (enforced by the codec-tests-on-save hook).
