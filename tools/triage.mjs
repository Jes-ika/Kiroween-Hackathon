// Ghostwire — triage-officer's CLI instrument.
// Thin wrapper: the briefing engine lives in js/triage-core.js (pure ESM)
// so the BROWSER console runs the exact same triage logic live, and the
// crew agent orchestrates this tool in Kiro. One brain, two hands.
//
// Usage:
//   node tools/triage.mjs transcript.txt
//   cat transcript.txt | node tools/triage.mjs
//   node tools/triage.mjs transcript.txt --json

import { readFileSync, existsSync } from 'node:fs';
import { triage } from '../js/triage-core.js';

const isMain = process.argv[1] && process.argv[1].endsWith('triage.mjs');
if (isMain) {
  const arg = process.argv.slice(2).filter((a) => a !== '--json');
  let input = '';
  if (arg[0] && existsSync(arg[0])) {
    input = readFileSync(arg[0], 'utf8');
  } else if (!process.stdin.isTTY) {
    input = readFileSync(0, 'utf8');
  } else {
    console.error('usage: node tools/triage.mjs <transcript.txt> [--json]  (or pipe stdin)');
    process.exit(1);
  }
  const { briefing, text } = triage(input);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(briefing, null, 2));
  } else {
    console.log(text);
  }
}
