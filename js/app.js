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

// Browsers only expose getUserMedia in secure contexts (HTTPS or localhost).
// A judge serving over LAN http:// would otherwise hit a silent mic failure.
function micSupported() {
  return window.isSecureContext && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
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

// ---- audio engine ----------------------------------------------------------
const audio = new GhostAudio({ onPacket: handlePacket, onLevel: (rms) => {
  const pct = Math.min(100, Math.max(0, rms * 400));
  meterFill.style.width = `${pct}%`;
} });

// ---- the live wire: oscilloscope of what the modem actually hears ----------
const scope = $('scope');
const scopeCtx = scope.getContext('2d');
let waveBuf = null;

function drawScope() {
  const dpr = window.devicePixelRatio || 1;
  const w = scope.clientWidth;
  const h = scope.clientHeight;
  if (w === 0 || h === 0) {
    requestAnimationFrame(drawScope);
    return;
  }
  if (scope.width !== Math.round(w * dpr) || scope.height !== Math.round(h * dpr)) {
    scope.width = Math.round(w * dpr);
    scope.height = Math.round(h * dpr);
  }
  scopeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scopeCtx.clearRect(0, 0, w, h);

  // faint graph-paper grid
  scopeCtx.strokeStyle = 'rgba(61, 143, 102, 0.22)';
  scopeCtx.lineWidth = 1;
  scopeCtx.beginPath();
  for (let gx = 0; gx <= w; gx += 24) {
    scopeCtx.moveTo(gx + 0.5, 0);
    scopeCtx.lineTo(gx + 0.5, h);
  }
  for (let gy = 0; gy <= h; gy += 12) {
    scopeCtx.moveTo(0, gy + 0.5);
    scopeCtx.lineTo(w, gy + 0.5);
  }
  scopeCtx.stroke();

  // the waveform itself (or a sleeping line before the séance opens)
  const an = audio.analyser;
  scopeCtx.strokeStyle = '#86ffb9';
  scopeCtx.lineWidth = 1.5;
  scopeCtx.shadowColor = 'rgba(134, 255, 185, 0.8)';
  scopeCtx.shadowBlur = 6;
  scopeCtx.beginPath();
  if (an) {
    if (!waveBuf || waveBuf.length !== an.fftSize) waveBuf = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(waveBuf);
    const step = Math.max(1, Math.floor(waveBuf.length / w));
    for (let x = 0, i = 0; x < w; x++, i += step) {
      const v = Math.max(-1, Math.min(1, waveBuf[i] || 0));
      const y = h / 2 + (v * h) / 2.2;
      if (x === 0) scopeCtx.moveTo(x, y);
      else scopeCtx.lineTo(x, y);
    }
  } else {
    scopeCtx.moveTo(0, h / 2);
    scopeCtx.lineTo(w, h / 2);
  }
  scopeCtx.stroke();
  scopeCtx.shadowBlur = 0;
  requestAnimationFrame(drawScope);
}
requestAnimationFrame(drawScope);

// ---- self-test (pure DSP round trip, no audio device needed) ---------------
function runSelfTest() {
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
  return ok;
}

// ---- guided séance: a judge's 30-second tour --------------------------------
let guiding = false;
async function guidedSeance() {
  if (guiding) return;
  guiding = true;
  try {
    addLog('sys', 'GUIDED SÉANCE — sit back, I will narrate the resurrection.');
    addLog('sys', '1/4 · proof of life: text encoded into pure tones, decoded back by pure math (no audio device involved).');
    runSelfTest();
    await sleep(2500);
    addLog('sys', '2/4 · the modem speaks: broadcasting I AM SAFE three times as FSK sound. Watch the wire below.');
    send('I AM SAFE', { to: 'ALL', repeat: 3 });
    await sleep(6000);
    addLog('sys', '3/4 · sound became text: the séance loop decoded those bursts live — that was the NETWORK LAYER. No internet.');
    addLog('sys', '4/4 · real air: open this page on a second device, check "speak out loud" here + "open the mic" there, and hold them close. The room is the network.');
  } finally {
    guiding = false;
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- wiring -----------------------------------------------------------------
async function openConsole() {
  $('overlay').classList.add('hidden');
  $('crt').classList.remove('hidden');
  try {
    await audio.start();
    addLog('sys', `séance open. sample rate ${audio.sr} Hz · GW-1 · 600 baud · Bell-202 ghost revived.`);
    addLog('sys', `you are «${state.me}». tip: two devices on this page can talk through the AIR — open mic on one, speakers on the other.`);
    addLog('sys', `no network involved. ever.`);
    if (!micSupported()) {
      $('mic').checked = false;
      $('mic').disabled = true;
      addLog('warn', 'the mic is locked out: browsers only allow it on HTTPS or localhost. For real-air demos, serve via localhost or GitHub Pages (HTTPS). The séance loop still works everywhere.');
    }
  } catch (err) {
    addLog('warn', `the spirits resist: ${err.message}`);
  }
}

$('start-btn').addEventListener('click', openConsole);
$('guided-btn').addEventListener('click', async () => {
  await openConsole();
  guidedSeance();
});
$('guided2').addEventListener('click', guidedSeance);

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
  if (e.target.checked && !micSupported()) {
    e.target.checked = false;
    addLog('warn', 'mic unavailable: open this page over HTTPS or localhost (browsers block getUserMedia on plain http). The séance loop still works everywhere.');
    return;
  }
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

$('selftest').addEventListener('click', runSelfTest);

fillCallsignSelect();
fillTargetSelect();
updateStats();
if (!micSupported()) {
  $('mic').checked = false;
  $('mic').disabled = true;
}
addLog('sys', 'the console is asleep. press BEGIN THE SÉANCE to wake it.');
