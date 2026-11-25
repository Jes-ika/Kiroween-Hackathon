import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { triage } from '../tools/triage.mjs';

const sample = readFileSync(new URL('../tools/sample-transcript.txt', import.meta.url), 'utf8');

test('triage ranks medical above water; location is critical per spec', () => {
  const { briefing } = triage(sample);
  assert.ok(briefing.critical.some((i) => i.text === 'NEED MEDICAL'), 'medical must be critical');
  assert.ok(briefing.critical.some((i) => i.text === 'COME TO ME'), 'location must be critical per spec');
  assert.ok(briefing.elevated.some((i) => i.text === 'NEED WATER'), 'water must be elevated');
  assert.equal(briefing.critical.length + briefing.elevated.length, 4);
});

test('triage counts echoes as echoes, not incidents', () => {
  const { briefing } = triage(sample);
  // three "an echo repeats" lines + one "faded" line in the sample
  assert.equal(briefing.echoes, 3);
  assert.equal(briefing.unresolved, 1);
});

test('triage counts repeat suffixes as corroboration', () => {
  const { briefing } = triage(sample);
  assert.equal(briefing.counts.MEDICAL, 2);
  assert.equal(briefing.counts['CHECK-IN'], 4, 'i am safe x1 + x3 + free-text = 4');
});

test('triage counts unique spirits', () => {
  const { briefing } = triage(sample);
  assert.equal(briefing.spirits, 5); // GHAST, BANSHEE, WRAITH, PHANTOM, SPOOK
});

test('triage always recommends an action, even on a calm wire', () => {
  const calm = triage('22:00:00 «GHAST» → ALL: hello there');
  assert.ok(calm.briefing.recommendedActions.length >= 1);
  assert.equal(calm.briefing.incidents, 1);
  const empty = triage('');
  assert.ok(empty.briefing.recommendedActions[0].includes('calm'));
});

test('triage tolerates real console noise (no packet lines)', () => {
  const { briefing } = triage('the console is asleep. press BEGIN THE SÉANCE to wake it.');
  assert.equal(briefing.incidents, 0);
});
