// Ghostwire — browser audio engine.
//
// The séance has three paths, all optional:
//  1. SPEAKERS  — master output to your real speakers (the modem's voice)
//  2. SÉANCE    — an in-page loop (master -> MediaStreamDestination -> decoder)
//                 so the app can demonstrate real-time acoustic transport with
//                 zero hardware — judges without a mic still see the ghost speak
//  3. MIC       — real air: another device's speaker into your microphone
//
// ScriptProcessorNode is deprecated-but-universal; it keeps v0 dependency-free
// and works identically on Chrome/Edge/Firefox. AudioWorklet is a noted
// migration task in .kiro/specs/acoustic-protocol/design.md.

import { encodePackets, Decoder } from './codec.js';

export class GhostAudio {
  constructor({ onPacket = null, onLevel = null } = {}) {
    this.onPacket = onPacket;
    this.onLevel = onLevel;
    this.ctx = null;
    this.sr = 48000;
    this.speakersOn = true;
    this.seanceOn = true;
    this.micOn = false;
  }

  // Must be called from a user gesture (browser autoplay policy).
  async start() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.sr = this.ctx.sampleRate;

    // master -> [speakers gate -> destination] and (when séance is on) -> [decoder tap]
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    // analyser tap: feeds the LIVE WIRE oscilloscope (pure observation, no routing)
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.master.connect(this.analyser);
    this.outGain = this.ctx.createGain();
    this.outGain.gain.value = this.speakersOn ? 1 : 0;
    this.master.connect(this.outGain);
    this.outGain.connect(this.ctx.destination);

    // decode path: both the séance loop and the mic sum into one processor
    this.proc = this.ctx.createScriptProcessor(4096, 1, 1);
    const mute = this.ctx.createGain(); // ScriptProcessor only pumps if connected onward
    mute.gain.value = 0;
    this.proc.connect(mute);
    mute.connect(this.ctx.destination);

    this.dec = new Decoder({}, this.sr, (pkt) => {
      if (this.onPacket) this.onPacket(pkt);
    });
    this.proc.onaudioprocess = (e) => {
      const ch = e.inputBuffer.getChannelData(0);
      this.dec.feed(ch);
      if (this.onLevel) this.onLevel(this.dec.level);
    };

    this.setSeance(this.seanceOn);
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setSpeakers(on) {
    this.speakersOn = on;
    if (this.outGain) this.outGain.gain.value = on ? 1 : 0;
  }

  setSeance(on) {
    this.seanceOn = on;
    if (!this.ctx) return;
    try {
      this.seanceTap.disconnect();
    } catch {
      /* first call: nothing connected yet */
    }
    this.seanceTap = null;
    if (on) {
      // Direct in-graph tap: the decoder hears exactly what the speakers get.
      // v0.1 routed this through a MediaStreamDestination roundtrip, which is
      // browser-quirk-prone (silence on some machines). A plain node
      // connection is the boring, reliable path.
      this.seanceTap = this.ctx.createGain();
      this.seanceTap.gain.value = 1;
      this.master.connect(this.seanceTap);
      this.seanceTap.connect(this.proc);
    }
  }

  async enableMic() {
    if (this.micOn) return;
    // echo/noise suppression would eat our FSK tones — they must stay off
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.micSrc = this.ctx.createMediaStreamSource(this.micStream);
    this.micSrc.connect(this.proc);
    this.micOn = true;
  }

  disableMic() {
    if (!this.micOn) return;
    this.micSrc.disconnect();
    for (const t of this.micStream.getTracks()) t.stop();
    this.micStream = null;
    this.micSrc = null;
    this.micOn = false;
  }

  // Play a payload into the air (and the séance loop). Returns duration (s).
  transmit(payloadBytes, { repeat = 1 } = {}) {
    if (!this.ctx) throw new Error('séance not started');
    const samples = encodePackets(Array(repeat).fill(payloadBytes), {}, this.sr);
    const buf = this.ctx.createBuffer(1, samples.length, this.sr);
    buf.copyToChannel(samples, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start(this.ctx.currentTime + 0.05);
    return samples.length / this.sr;
  }
}
