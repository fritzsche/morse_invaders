// MorseTiming class - calculates durations based on WPM
// Uses PARIS standard: 50 dot units per minute at 1 WPM
export class MorseTiming {
  constructor(wpm) {
    // Validate wpm - must be between 5 and 30
    this.wpm = Math.max(5, Math.min(30, wpm || 15));
    // dot unit in milliseconds = 60000ms / (wpm * 50 dot units per minute)
    this.dotUnit = 60000 / (this.wpm * 50);
  }

  get dotDuration() {
    return this.dotUnit;
  }

  get dashDuration() {
    return this.dotUnit * 3;
  }

  get symbolSpace() {
    return this.dotUnit; // space between dots/dashes within a letter
  }

  get letterSpace() {
    return this.dotUnit * 3; // space between letters
  }

  get wordSpace() {
    return this.dotUnit * 7; // space between words
  }
}
