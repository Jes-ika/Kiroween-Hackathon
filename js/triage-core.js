// Ghostwire — triage core (pure, browser-safe).
// Used by three consumers: the live console (séance log → incident counts),
// the triage-officer's CLI instrument (tools/triage.mjs), and its tests.

const SOS_TYPES = {
  'NEED MEDICAL': { priority: 4, label: 'MEDICAL' },
  'COME TO ME': { priority: 3, label: 'LOCATION' },
  'NEED WATER': { priority: 2, label: 'WATER' },
  'I AM SAFE': { priority: 1, label: 'CHECK-IN' },
};

const PACKET_RE =
  /(?:(\d{2}:\d{2}:\d{2})\s+)?«([A-Z0-9]+)»\s*→\s*(\S+):\s*(.+?)(?:\s*\(×(\d+)\))?$/;

export function triage(transcript, now = new Date()) {
  const incidents = [];
  const spirits = new Map();
  let echoes = 0;
  let unresolved = 0;

  for (const rawLine of transcript.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/an echo repeats|deduped/.test(line)) {
      echoes++;
      continue;
    }
    if (/corrupted whisper|no hops left|SELF-TEST ERROR/.test(line)) {
      unresolved++;
      continue;
    }
    const m = line.match(PACKET_RE);
    if (!m) continue;
    const [, time, from, to, text, timesRaw] = m;
    spirits.set(from, (spirits.get(from) || 0) + 1);
    const clean = text.trim();
    // case-insensitive exact match: "i am safe" and "I AM SAFE" are the same cry
    const type = SOS_TYPES[clean.toUpperCase()] || { priority: 0, label: 'OTHER' };
    incidents.push({
      time: time || null,
      from,
      to,
      text: clean,
      repeats: timesRaw ? parseInt(timesRaw, 10) : 1,
      priority: type.priority,
      label: type.label,
    });
  }

  const byPriority = (a, b) =>
    b.priority - a.priority ||
    (b.time || '').localeCompare(a.time || '');
  const distress = incidents.filter((i) => i.priority >= 2).sort(byPriority);
  const critical = distress.filter((i) => i.priority >= 3);
  const elevated = distress.filter((i) => i.priority === 2);
  const stable = incidents.filter((i) => i.priority === 1);

  const counts = {};
  for (const i of incidents) counts[i.label] = (counts[i.label] || 0) + i.repeats;

  const actions = [];
  if (critical.some((i) => i.label === 'MEDICAL')) {
    actions.push('Dispatch/flag MEDICAL traffic first — it outranks everything on the wire.');
  }
  if (critical.some((i) => i.label === 'LOCATION')) {
    actions.push('Confirm responder position for COME TO ME calls; ask relay neighbors to extend range.');
  }
  if (elevated.length) actions.push('Aggregate WATER requests by area before relaying upward.');
  const other = incidents.filter((i) => i.priority === 0);
  if (other.length) {
    actions.push(`${other.length} uncategorized whisper(s) — review the raw transcript; free text may carry needs the presets miss.`);
  }
  if (unresolved > 0) actions.push(`${unresolved} whisper(s) faded or garbled — consider re-broadcast or shorter messages.`);
  if (!incidents.length) actions.push('No distress traffic heard. Keep the mic open; a calm wire is also a reportable state.');

  const briefing = {
    generatedAt: now.toISOString(),
    heardTotal: incidents.reduce((a, i) => a + i.repeats, 0),
    incidents: incidents.length,
    spirits: spirits.size,
    counts,
    echoes: echoes,
    unresolved,
    critical: critical.map((i) => ({ time: i.time, from: i.from, text: i.text, repeats: i.repeats })),
    elevated: elevated.map((i) => ({ time: i.time, from: i.from, text: i.text, repeats: i.repeats })),
    stable: stable.map((i) => ({ time: i.time, from: i.from, repeats: i.repeats })),
    recommendedActions: actions,
  };

  const text = [
    'GHOSTWIRE TRIAGE BRIEFING',
    `generated ${briefing.generatedAt}`,
    `heard ${briefing.heardTotal} · incidents ${incidents.length} · spirits ${spirits.size} · echoes ${echoes} · unresolved ${unresolved}`,
    '',
    'CRITICAL:',
    ...(critical.length
      ? critical.map((i) => `  [${i.label}] «${i.from}» ${i.time || '--:--:--'} "${i.text}"${i.repeats > 1 ? ` ×${i.repeats}` : ''}`)
      : ['  (none)']),
    'ELEVATED:',
    ...(elevated.length
      ? elevated.map((i) => `  [${i.label}] «${i.from}» ${i.time || '--:--:--'} "${i.text}"`)
      : ['  (none)']),
    'STABLE CHECK-INS:',
    ...(stable.length
      ? stable.map((i) => `  «${i.from}» ${i.time || '--:--:--'} ×${i.repeats}`)
      : ['  (none)']),
    '',
    'RECOMMENDED ACTIONS:',
    ...actions.map((a) => `  • ${a}`),
  ].join('\n');

  return { briefing, text };
}
