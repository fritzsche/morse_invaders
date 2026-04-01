// MorseWorkletProcessor - AudioWorkletProcessor for sample-accurate morse code playback
// Runs on the audio rendering thread, isolated from the main JS thread.
// Cannot use ES6 imports — all logic is self-contained.
//
// Messages received (from main thread via port):
//   { type: 'schedule', morseCode, dotUnit, frequency, volume, envelopeMs }
//   { type: 'stop' }
//
// Messages sent (to main thread via port):
//   { type: 'symbolStart', index }  — first sample of each dot/dash
//   { type: 'symbolEnd',   index }  — last sample of each dot/dash
//   { type: 'letterComplete' }      — after the trailing letter-space silence ends
//   { type: 'stopped' }             — after a 'stop' command is processed

class MorseWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._sequence = [];      // [{tone,samples,index}|{space,samples,letter}]
    this._seqIndex = 0;
    this._samplePos = 0;
    this._isRunning = false;
    this._stopped = false;
    this._frequency = 700;
    this._volume = 0.3;
    this._envelopeSamples = 0;
    this._phase = 0;          // sin phase accumulator — preserved across process() blocks

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'schedule') {
        const sr = sampleRate; // AudioWorklet global
        const dot  = Math.ceil(msg.dotUnit * sr / 1000);
        const dash = dot * 3;
        const sym  = dot;       // symbol space = 1 dot unit
        const letter = dot * 3; // letter space = 3 dot units

        this._frequency      = msg.frequency;
        this._volume         = msg.volume;
        this._envelopeSamples = Math.ceil(msg.envelopeMs * sr / 1000);

        // Build flat sequence: tone items interleaved with silence items
        this._sequence = [];
        for (let i = 0; i < msg.morseCode.length; i++) {
          const isDot = msg.morseCode[i] === '.';
          this._sequence.push({ tone: true, samples: isDot ? dot : dash, index: i });
          if (i < msg.morseCode.length - 1) {
            this._sequence.push({ tone: false, samples: sym });
          }
        }
        // Trailing letter-space silence — signals end of one full spelling
        this._sequence.push({ tone: false, samples: letter, letter: true });

        this._seqIndex  = 0;
        this._samplePos = 0;
        this._phase     = 0;
        this._stopped   = false;
        this._isRunning = true;

      } else if (msg.type === 'stop') {
        this._stopped = true;
      }
    };
  }

  process(inputs, outputs) {
    const out = outputs[0][0];
    if (!out) return true;

    // Handle stop request: zero output, post ack, clear state
    if (this._stopped || !this._isRunning) {
      out.fill(0);
      if (this._stopped) {
        this.port.postMessage({ type: 'stopped' });
        this._stopped   = false;
        this._isRunning = false;
      }
      return true;
    }

    let i = 0;
    while (i < out.length && this._seqIndex < this._sequence.length) {
      const item = this._sequence[this._seqIndex];

      if (item.tone) {
        // --- Tone (dot or dash) ---
        if (this._samplePos === 0) {
          this.port.postMessage({ type: 'symbolStart', index: item.index });
        }

        // Raised-cosine envelope
        const t   = this._samplePos / sampleRate;
        const dur = item.samples    / sampleRate;
        const ramp = this._envelopeSamples / sampleRate;
        let env;
        if      (t < ramp)       env = (1 - Math.cos(Math.PI * t       / ramp)) / 2;
        else if (t > dur - ramp) env = (1 - Math.cos(Math.PI * (dur-t) / ramp)) / 2;
        else                     env = 1;

        // Phase accumulator — keeps phase continuous across 128-sample blocks
        this._phase += 2 * Math.PI * this._frequency / sampleRate;
        if (this._phase > 2 * Math.PI) this._phase -= 2 * Math.PI;

        out[i++] = Math.sin(this._phase) * env * this._volume;
        this._samplePos++;

        if (this._samplePos >= item.samples) {
          this.port.postMessage({ type: 'symbolEnd', index: item.index });
          this._samplePos = 0;
          this._seqIndex++;
        }

      } else {
        // --- Silence (symbol space or letter space) ---
        const remaining = item.samples - this._samplePos;
        const fill = Math.min(out.length - i, remaining);
        out.fill(0, i, i + fill);
        i              += fill;
        this._samplePos += fill;

        if (this._samplePos >= item.samples) {
          if (item.letter) {
            this.port.postMessage({ type: 'letterComplete' });
          }
          this._samplePos = 0;
          this._seqIndex++;
        }
      }
    }

    // Zero-fill any remaining samples in the block
    out.fill(0, i);

    return true; // keep processor alive
  }
}

registerProcessor('morse-worklet', MorseWorkletProcessor);
