// Ghostwire — séance console (DOM wiring, envelope logic, relay inbox).
import { GhostAudio } from './audio.js';
import { encodePackets, decodeBurst } from './codec.js';
import {
  envelope, textToPayload, payloadToText, fnv1a, randomCallsign, GHOST_NAMES, GW1,
} from './protocol.js';

const $ = (id) => document.getElementById(id);
const log = $('log');
const meterFill = $('meter-fill');

const state = {
  me: randomCallsign(),
  seen: new Map(), // fnv1a(payloadBytes) -> count
  stats: { sent: 0, heard: 0, dupes: 0, relayed: 0 },
};

function addLog(type, text) {
  const line = document.createElement('div');
  line.className = `line ${type}`;
  const time = new Date().toLocaleTimeString([], { hour12: false });
  line.innerHTML = `<span class="t">${time}</span> ${text}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function updateStats() {
  $('stats').textContent =
    `sent ${state.stats.sent} · heard ${state.stats.heard} · echoes ${state.stats.dupes} · carried ${state.stats.relayed}`;
}

function lamp(cls, ms = 700) {
  const el = $('status-lamp');
  el.className = `lamp ${cls}`;
  clearTimeout(lamp._t);
  lamp._t = setTimeout(() => (el.className = 'lamp idle'), ms);
}

function fillCallsignSelect() {
  const sel = $('callsign');
  sel.innerHTML = GHOST_NAMES.map((n) => `<option value="${n}">${n}</option>`).join('');
  sel.value = state.me;
}

function fillTargetSelect() {
  const sel = $('target');
  sel.innerHTML =
    `<option value="ALL">→ ALL SPIRITS</option>` +
    GHOST_NAMES.filter((n) => n !== state.me).map((n) => `<option value="${n}">→ ${n}</option>`).join('');
}

// ---- packet handling: deliver, or carry as a relay ghost -------------------
function handlePacket(bytes) {
  lamp('rx');
  let env;
  try {
    env = JSON.parse(payloadToText(bytes));
  } catch {
    addLog('warn', 'a corrupted whisper dissolved (bad envelope)');
    return;
  }

  const key = fnv1a(bytes);
  if (state.seen.has(key)) {
    const n = state.seen.get(key) + 1;
    state.seen.set(key, n);
    state.stats.dupes++;
    updateStats();
    if (n <= 3) addLog('sys', `an echo repeats (${n}×) — deduped`);
    return;
  }
  state.seen.set(key, 1);

  if (env.t === 'ALL' || env.t === state.me) {
    state.stats.heard++;
    const dest = env.t === 'ALL' ? 'ALL' : 'me';
    const sos = isSos(env.m);
    addLog(sos ? 'sos' : 'heard', `<b>«${esc(env.f)}»</b> → ${dest}: ${esc(env.m)}`);
  } else if (env.ttl > 0) {
    state.stats.relayed++;
    const carried = JSON.stringify({ ...env, ttl: env.ttl - 1 });
    setTimeout(() => {
      try {
        audio.transmit(textToPayload(carried), { repeat: 1 });
        lamp('tx');
      } catch {
        /* séance closed before the ghost could fly */
      }
    }, 400 + Math.random() * 1200);
    addLog('relay', `carrying «${esc(env.f)}»'s whisper toward ${esc(env.t)} (ttl ${env.ttl}→${env.ttl - 1})`);
  } else {
    addLog('sys', `a whisper meant for ${esc(env.t)} faded here — no hops left`);
  }
  updateStats();
}

const SOS_SET = new Set(['I AM SAFE', 'NEED MEDICAL', 'NEED WATER', 'COME TO ME']);
const isSos = (m) => SOS_SET.has(m);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function send(text, { to = 'ALL', repeat = 1 } = {}) {
  const bytes = textToPayload(envelope(state.me, to, 2, text, Math.floor(Date.now() / 1000)));
  if (bytes.length > GW1.maxPayload) {
    addLog('warn', `whisper too heavy for the wire (${bytes.length}B > ${GW1.maxPayload}B)`);
    return;
  }
  const dur = audio.transmit(bytes, { repeat });
  state.stats.sent++;
  state.seen.set(fnv1a(bytes), 1); // don't decode our own ghost back
  lamp('tx', Math.max(700, dur * 1000));
  addLog('sent', `<b>«${esc(state.me)}»</b> → ${to === 'ALL' ? 'ALL' : esc(to)}: ${esc(text)}${repeat > 1 ? ` (×${repeat})` : ''}`);
  updateStats();
}

// ---- wire up the console ---------------------------------------------------
const audio = new GhostAudio({ onPacket: handlePacket, onLevel: (rms) => {
  const pct = Math.min(100, Math.max(0, rms * 400));
  meterFill.style.width = `${pct}%`;
} });

$('start-btn').addEventListener('click', async () => {
  $('overlay').classList.add('hidden');
  $('crt').classList.remove('hidden');
  try {
    await audio.start();
    addLog('sys', `séance open. sample rate ${audio.sr} Hz · GW-1 · 600 baud · Bell-202 ghost revived.`);
    addLog('sys', `you are «${state.me}». tip: two devices on this page can talk through the AIR — open mic on one, speakers on the other.`);
    addLog('sys', `no network involved. ever.`);
  } catch (err) {
    addLog('warn', `the spirits resist: ${err.message}`);
  }
});

$('callsign').addEventListener('change', (e) => {
  state.me = e.target.value;
  fillTargetSelect();
  addLog('sys', `you now haunt as «${state.me}»`);
});

$('reroll').addEventListener('click', () => {
  state.me = randomCallsign();
  $('callsign').value = state.me;
  fillTargetSelect();
});

$('send').addEventListener('click', () => {
  const text = $('msg').value.trim();
  if (!text) return;
  send(text, { to: $('target').value });
  $('msg').value = '';
});

$('msg').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    $('send').click();
  }
});

document.querySelectorAll('[data-sos]').forEach((btn) => {
  btn.addEventListener('click', () => send(btn.dataset.sos, { to: 'ALL', repeat: 3 }));
});

$('spk').addEventListener('change', (e) => audio.setSpeakers(e.target.checked));
$('loop').addEventListener('change', (e) => audio.setSeance(e.target.checked));
$('mic').addEventListener('change', async (e) => {
  try {
    if (e.target.checked) {
      await audio.enableMic();
      addLog('sys', 'microphone open. headphones recommended — the mic hearing your own speakers just makes echoes.');
    } else {
      audio.disableMic();
    }
  } catch (err) {
    e.target.checked = false;
    addLog('warn', `mic refused: ${err.message}`);
  }
});

$('selftest').addEventListener('click', () => {
  // pure-DSP round trip: encode -> decode, no audio device involved. This is
  // the same code path the air uses, minus the transducer.
  const phrase = `self-test ${Math.random().toString(36).slice(2, 10).toUpperCase()} — the wire is haunted but honest`;
  const payload = textToPayload(envelope(state.me, 'ALL', 2, phrase, Math.floor(Date.now() / 1000)));
  const t0 = performance.now();
  const samples = encodePackets([payload], {}, 48000);
  const frames = decodeBurst(samples, {}, 48000);
  const ms = (performance.now() - t0).toFixed(0);
  const ok = frames.length === 1 && fnv1a(frames[0]) === fnv1a(payload);
  addLog(ok ? 'test' : 'warn',
    ok ? `SELF-TEST PASSED in ${ms} ms — ${samples.length} samples of pure math carried your words intact.`
       : 'SELF-TEST FAILED — the wire ate your words.');
});

fillCallsignSelect();
fillTargetSelect();
updateStats();
addLog('sys', 'the console is asleep. press BEGIN THE SÉANCE to wake it.');
