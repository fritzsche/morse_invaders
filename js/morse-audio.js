import { GameConfig } from './constants.js';
import { MorseTiming } from './morse-timing.js';

// MorseAudioEngine - Web Audio API for morse code sounds
// Dot/dash tones are played via AudioWorkletProcessor (morse-worklet-processor.js)
// for sample-accurate timing on the audio thread.
// Non-morse sounds (buzzer, explosion, playerDeath) use oscillator nodes as before.
export class MorseAudioEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.frequency = GameConfig.MORSE_TONE_FREQUENCY;
    this.envelopeTime = GameConfig.ENVELOPE_TIME_MS;
    this.timing = null;
    this.enabled = true;

    // Worklet state
    this.workletNode = null;
    this.workletReady = false;
    this._stopAckResolve = null;  // resolve fn waiting for 'stopped' ack
    this._onWorkletMessage = null; // callback set by GameLoop
  }

  async init(wpm = 15) {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.masterGain.gain.value = 0.5;
    this.timing = new MorseTiming(wpm);

    // Load the worklet processor module (requires HTTPS or localhost)
    await this.audioContext.audioWorklet.addModule('./js/morse-worklet-processor.js');

    this.workletNode = new AudioWorkletNode(this.audioContext, 'morse-worklet');
    this.workletNode.connect(this.masterGain);

    this.workletNode.port.onmessage = (e) => {
      const msg = e.data;
      // Resolve any pending stopAll() promise
      if (msg.type === 'stopped' && this._stopAckResolve) {
        this._stopAckResolve();
        this._stopAckResolve = null;
      }
      // Forward all messages to GameLoop
      if (this._onWorkletMessage) {
        this._onWorkletMessage(msg);
      }
    };

    this.workletReady = true;
  }

  setWpm(wpm) {
    this.timing = new MorseTiming(wpm);
    // No worklet interaction needed — next scheduleLetter() will use the new dotUnit
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // Register a callback that receives all worklet port messages
  // (symbolStart, symbolEnd, letterComplete, stopped)
  setWorkletMessageHandler(fn) {
    this._onWorkletMessage = fn;
  }

  // Send the full morse letter sequence to the worklet for sample-accurate playback
  scheduleLetter(morseCode, timing) {
    if (!this.enabled || !this.workletReady || !this.workletNode) return;
    this.workletNode.port.postMessage({
      type: 'schedule',
      morseCode,
      dotUnit: timing.dotUnit,
      frequency: this.frequency,
      volume: 0.3,
      envelopeMs: this.envelopeTime
    });
  }

  // Stop all currently playing audio.
  // Sends 'stop' to the worklet and awaits the 'stopped' ack so callers
  // can optionally await clean silence. Fire-and-forget (no await) is also safe.
  async stopAll() {
    if (!this.workletReady || !this.workletNode) return;
    // If a stop is already pending, wait for the same promise
    if (this._stopAckResolve) return;

    const ackPromise = new Promise(resolve => {
      this._stopAckResolve = resolve;
    });
    this.workletNode.port.postMessage({ type: 'stop' });
    await ackPromise;
  }

  // Wrong answer buzzer - harsh 150Hz square wave
  playBuzzer() {
    if (!this.enabled || !this.audioContext) return;

    const durationSec = 0.2;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = 150;
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.setValueAtTime(0.2, now + 0.001);
    gainNode.gain.setValueAtTime(0.2, now + durationSec - 0.01);
    gainNode.gain.setValueAtTime(0, now + durationSec);

    oscillator.start(now);
    oscillator.stop(now + durationSec + 0.01);
  }

  // Explosion sound - low frequency boom with noise
  playExplosion() {
    if (!this.enabled || !this.audioContext) return;

    const durationSec = 0.3;

    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 80;
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    const now = this.audioContext.currentTime;
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.setValueAtTime(0.4, now + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + durationSec);
    osc.start(now);
    osc.stop(now + durationSec + 0.01);

    // Noise burst
    const bufferSize = this.audioContext.sampleRate * durationSec;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    const noise = this.audioContext.createBufferSource();
    const noiseGain = this.audioContext.createGain();
    noise.buffer = buffer;
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseGain.gain.setValueAtTime(0.15, now);
    noise.start(now);
  }

  // Player death sound - dramatic descending explosion
  playPlayerDeath() {
    if (!this.enabled || !this.audioContext) return;

    const durationSec = 0.5;

    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 200;
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    const now = this.audioContext.currentTime;
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + durationSec);
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.setValueAtTime(0.5, now + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + durationSec);

    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  }
}
