import { GameConfig } from './constants.js';
import { MorseTiming } from './morse-timing.js';

// MorseAudioEngine - Web Audio API for morse code sounds with raised cosine envelope
export class MorseAudioEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.frequency = GameConfig.MORSE_TONE_FREQUENCY;
    this.envelopeTime = GameConfig.ENVELOPE_TIME_MS; // ms for attack/release
    this.timing = null;
    this.enabled = true;
  }

  init(wpm = 15) {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.masterGain.gain.value = 0.5;
    this.timing = new MorseTiming(wpm);
  }

  setWpm(wpm) {
    this.timing = new MorseTiming(wpm);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // Raised cosine envelope: (1 - cos(π * t / T)) / 2 for t in [0, T]
  // This creates a smooth ramp up/down to prevent key clicks
  _getEnvelopeValue(t, rampTime) {
    if (t <= 0) return 0;
    if (t >= rampTime) return 1;
    return (1 - Math.cos(Math.PI * t / rampTime)) / 2;
  }

  // Play a tone with raised cosine envelope shaping
  playTone(durationMs, frequency = null) {
    if (!this.enabled || !this.audioContext) return;

    try {
      const freq = frequency || this.frequency;
      const durationSec = durationMs / 1000;
      const rampTimeSec = this.envelopeTime / 1000;
      const volume = 0.3;

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = freq;

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);

      const now = this.audioContext.currentTime;

      // Attack phase - raised cosine ramp up
      gainNode.gain.setValueAtTime(0, now);
      const attackSamples = Math.ceil(rampTimeSec * 1000); // 1ms resolution
      if (attackSamples < 1) attackSamples = 1;
      for (let i = 0; i <= attackSamples; i++) {
        const t = (i / attackSamples) * rampTimeSec;
        const envelope = this._getEnvelopeValue(t, rampTimeSec);
        gainNode.gain.setValueAtTime(envelope * volume, now + t);
      }

      // Sustain phase - hold at full volume
      gainNode.gain.setValueAtTime(volume, now + rampTimeSec);

      // Release phase - raised cosine ramp down
      const releaseStart = durationSec - rampTimeSec;
      gainNode.gain.setValueAtTime(volume, now + releaseStart);
      for (let i = 1; i <= attackSamples; i++) {
        const t = (i / attackSamples) * rampTimeSec;
        const envelope = this._getEnvelopeValue(rampTimeSec - t, rampTimeSec);
        gainNode.gain.setValueAtTime(envelope * volume, now + releaseStart + t);
      }

      // Ensure it ends at 0
      gainNode.gain.setValueAtTime(0, now + durationSec);

      oscillator.start(now);
      oscillator.stop(now + durationSec + 0.01);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  playDot() {
    if (this.timing) {
      this.playTone(this.timing.dotDuration);
    }
  }

  playDash() {
    if (this.timing) {
      this.playTone(this.timing.dotDuration * 3);
    }
  }

  // Play inter-symbol silence (between dots and dashes)
  playSymbolSpace() {
    if (this.timing && this.enabled) {
      const delay = this.timing.symbolSpace;
      // Small click-less pause
      const now = this.audioContext ? this.audioContext.currentTime : 0;
      // Just a small silent gap - no sound needed
    }
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

    // Sharp attack, quick release for harsh buzzer sound
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
}
