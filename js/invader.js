import { MORSE_CODE } from './constants.js';

// Invader class - represents an enemy ship that descends and spells morse code
export class Invader {
  constructor(x, y, letter, type) {
    this.x = x;
    this.y = y;
    this.letter = letter.toUpperCase();
    this.morseCode = MORSE_CODE[this.letter] || '-----';
    this.type = type; // 'type1', 'type2', or 'type3'
    this.width = 33; // 11 pixels * 3 scale
    this.height = 24; // 8 pixels * 3 scale
    this.currentSymbolIndex = 0;
    this.isDestroyed = false;
    this.isActive = false; // currently spelling morse
    this.morsePlaying = false;
  }

  // Get the current symbol being spelled (dot or dash)
  get currentSymbol() {
    if (this.currentSymbolIndex >= this.morseCode.length) {
      return null;
    }
    return this.morseCode[this.currentSymbolIndex];
  }

  // Get the morse code displayed so far
  get displayedMorse() {
    return this.morseCode.substring(0, this.currentSymbolIndex + 1);
  }

  // Advance to next symbol in the morse code
  // Returns true if there are more symbols, false if finished
  advanceSymbol() {
    if (this.currentSymbolIndex < this.morseCode.length - 1) {
      this.currentSymbolIndex++;
      return true;
    }
    // Finished spelling - reset for next time this invader becomes active
    return false;
  }

  // Reset morse spelling to beginning
  resetMorse() {
    this.currentSymbolIndex = 0;
    this.isActive = false;
    this.morsePlaying = false;
  }

  // Check if a point is within this invader's bounds
  containsPoint(px, py) {
    const left = this.x - this.width / 2;
    const right = this.x + this.width / 2;
    const top = this.y - this.height / 2;
    const bottom = this.y + this.height / 2;
    return px >= left && px <= right && py >= top && py <= bottom;
  }
}
