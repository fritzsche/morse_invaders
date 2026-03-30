import { GameConfig } from './constants.js';
import { MorseTiming } from './morse-timing.js';

// MorseAudioEngine - Web Audio API for morse code sounds using AudioBufferSourceNode
// This approach allows clean stop() when switching invaders
export class MorseAudioEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.frequency = GameConfig.MORSE_TONE_FREQUENCY;
    this.envelopeTime = GameConfig.ENVELOPE_TIME_MS; // ms for attack/release
    this.timing = null;
    this.enabled = true;
    this.currentSource = null; // current AudioBufferSourceNode for morse tones
  }

  init(wpm = 15) {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.masterGain.gain.value = 0.5;
    this.timing = new MorseTiming(wpm);

    // Pre-generate tone buffers for dot and dash
    this._generateToneBuffers();
  }

  // Generate pre-computed tone buffers with envelope
  _generateToneBuffers() {
    if (!this.timing || !this.audioContext) return;

    this.dotBuffer = this._createToneBuffer(this.frequency, this.timing.dotDuration);
    this.dashBuffer = this._createToneBuffer(this.frequency, this.timing.dotDuration * 3);
  }

  // Create a single tone buffer with raised cosine envelope
  _createToneBuffer(frequency, durationMs) {
    const sampleRate = this.audioContext.sampleRate;
    const length = Math.ceil(sampleRate * (durationMs / 1000));
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const durationSec = durationMs / 1000;
    const rampTime = this.envelopeTime / 1000;
    const volume = 0.3;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;

      // Raised cosine envelope
      let envelope;
      if (t < rampTime) {
        // Attack phase
        envelope = (1 - Math.cos(Math.PI * t / rampTime)) / 2;
      } else if (t > durationSec - rampTime) {
        // Release phase
        const releaseT = durationSec - t;
        envelope = (1 - Math.cos(Math.PI * releaseT / rampTime)) / 2;
      } else {
        // Sustain phase
        envelope = 1.0;
      }

      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * volume;
    }

    return buffer;
  }

  setWpm(wpm) {
    this.timing = new MorseTiming(wpm);
    this._generateToneBuffers(); // Regenerate buffers with new timing
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // Stop all currently playing audio - clean stop using AudioBufferSourceNode.stop()
  stopAll() {
    if (this.currentSource) {
      try {
        console.log('[Audio] Stopping current source');
        this.currentSource.stop();
      } catch (e) {
        // Already stopped or not started
      }
      this.currentSource = null;
    }
  }

  playDot() {
    if (!this.enabled || !this.timing || !this.dotBuffer) return;
    console.log(`[Audio] PLAY DOT: duration=${this.timing.dotDuration}ms`);

    // Stop any currently playing tone first
    this.stopAll();

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = this.dotBuffer;
    this.currentSource.connect(this.masterGain);
    this.currentSource.start();
  }

  playDash() {
    if (!this.enabled || !this.timing || !this.dashBuffer) return;
    console.log(`[Audio] PLAY DASH: duration=${this.timing.dotDuration * 3}ms`);

    // Stop any currently playing tone first
    this.stopAll();

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = this.dashBuffer;
    this.currentSource.connect(this.masterGain);
    this.currentSource.start();
  }

  // Wrong answer buzzer - harsh 150Hz square wave
  // Uses oscillator approach since we don't need to stop it mid-play
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

    // Sharp attack, quick release for harsh buzzer sound
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.setValueAtTime(0.2, now + 0.001);
    gainNode.gain.setValueAtTime(0.2, now + durationSec - 0.01);
    gainNode.gain.setValueAtTime(0, now + durationSec);

    oscillator.start(now);
    oscillator.stop(now + durationSec + 0.01);
  }

  // Explosion sound - low frequency boom with noise
  // Uses oscillator + noise buffer approach
  playExplosion() {
    if (!this.enabled || !this.audioContext) return;

    const durationSec = 0.3;

    // Low frequency oscillator for boom
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 80;

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    const now = this.audioContext.currentTime;

    // Quick boom envelope
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.setValueAtTime(0.4, now + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + durationSec);

    osc.start(now);
    osc.stop(now + durationSec + 0.01);

    // Add some noise burst
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

    // Descending oscillator
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 200;

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    const now = this.audioContext.currentTime;

    // Descending pitch
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + durationSec);

    // Envelope
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.setValueAtTime(0.5, now + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + durationSec);

    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  }
}
