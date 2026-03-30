# Morse Code Space Invaders - Implementation Plan

## Context
Build a single-page web app game to learn Morse code, inspired by Space Invaders. Players must type the correct letter (matched to its Morse code broadcast by descending invaders) before the invader reaches the bottom. User-configurable: learned character set and WPM speed.

**No external dependencies** - pure HTML/CSS/JavaScript using ES6 modules.

---

## File Structure
```
morse_invader/
├── index.html          # Main HTML with canvas and module loading
├── js/
│   ├── main.js         # Entry point, wires everything together
│   ├── constants.js    # MORSE_CODE dictionary, game constants
│   ├── morse-timing.js # MorseTiming class
│   ├── morse-audio.js  # MorseAudioEngine class
│   ├── invader.js      # Invader class
│   ├── laser.js        # Laser class
│   ├── explosion.js    # ExplosionAnimation class
│   ├── renderer.js     # Renderer class
│   ├── game.js         # Game class (state machine)
│   ├── game-loop.js    # GameLoop class
│   └── input-handler.js # InputHandler class
└── CLAUDE.md           # This plan
```

---

## ES6 Module Structure (one class per file)

| Module | Class | Responsibility |
|--------|-------|----------------|
| `constants.js` | - | MORSE_CODE dict, GameConfig, sprite data |
| `morse-timing.js` | `MorseTiming` | WPM-based timing calculations |
| `morse-audio.js` | `MorseAudioEngine` | Web Audio API: dots, dashes, buzzer, explosion |
| `invader.js` | `Invader` | Position, letter, morse state, descent |
| `laser.js` | `Laser` | Position, velocity, target tracking |
| `explosion.js` | `ExplosionAnimation` | Particle-based explosion animation |
| `renderer.js` | `Renderer` | All canvas drawing |
| `game.js` | `Game` | State, score, lives, invaders, reset/spawn |
| `game-loop.js` | `GameLoop` | requestAnimationFrame loop |
| `input-handler.js` | `InputHandler` | Keyboard events |

---

## Implementation Steps

### Step 1: HTML Shell (`index.html`)
- `<canvas id="gameCanvas" width="800" height="600">`
- Minimal CSS to center canvas
- `<script type="module" src="js/main.js">`

### Step 2: Constants (`js/constants.js`)
```javascript
export const MORSE_CODE = { /* A-Z, 0-9 */ };
export const GameConfig = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  INVADER_ROWS: 2,
  INVADER_COLS: 4,
  BASE_DESCENT_SPEED: 0.5,
  SPEED_INCREASE_PER_LEVEL: 0.15,
  POINTS_PER_INVADER: 100,
  WAVE_CLEAR_BONUS: 500,
  INITIAL_LIVES: 3
};
export const INVADER_SPRITES = { type1: [...], type2: [...], type3: [...] };
export const PLAYER_SPRITE = [...];
```

### Step 3: Morse Timing (`js/morse-timing.js`)
```javascript
export class MorseTiming {
  constructor(wpm) {
    this.dotUnit = 60000 / (wpm * 50);
  }
  get dotDuration()    { return this.dotUnit; }
  get dashDuration()   { return this.dotUnit * 3; }
  get symbolSpace()    { return this.dotUnit; }
  get letterSpace()    { return this.dotUnit * 3; }
}
```

### Step 4: Audio Engine (`js/morse-audio.js`)
```javascript
export class MorseAudioEngine {
  constructor() {
    this.audioContext = null;
    this.gainNode = null;
    this.frequency = 700; // Hz standard morse tone
    this.envelopeTime = 5; // ms for attack/release ramp
  }

  init() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.gainNode.gain.value = 0;
  }

  // Raised cosine envelope: (1 - cos(2π * t / T)) / 2 for t in [0, T]
  // This prevents key clicks by smoothly ramping amplitude
  getEnvelopeValue(t, totalDuration) {
    const rampTime = this.envelopeTime / 1000; // convert to seconds
    const tNorm = t % totalDuration; // normalize to 0 to totalDuration

    if (tNorm < rampTime) {
      // Attack phase: ramp up with raised cosine
      const phase = Math.PI * tNorm / rampTime;
      return (1 - Math.cos(phase)) / 2;
    } else if (tNorm > totalDuration - rampTime) {
      // Release phase: ramp down with raised cosine
      const releaseT = totalDuration - tNorm;
      const phase = Math.PI * releaseT / rampTime;
      return (1 - Math.cos(phase)) / 2;
    }
    return 1.0; // sustain phase - full volume
  }

  playTone(durationMs) {
    const durationSec = durationMs / 1000;
    const attackSec = this.envelopeTime / 1000;
    const totalDuration = durationSec;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = this.frequency;

    oscillator.connect(gainNode);
    gainNode.connect(this.gainNode);

    // Schedule envelope using raised cosine
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);

    // Attack phase
    for (let t = 0; t <= attackSec; t += 0.001) {
      const envelope = (1 - Math.cos(Math.PI * t / attackSec)) / 2;
      gainNode.gain.setValueAtTime(envelope * 0.3, now + t);
    }

    // Sustain phase
    gainNode.gain.setValueAtTime(0.3, now + attackSec);
    gainNode.gain.setValueAtTime(0.3, now + durationSec - attackSec);

    // Release phase
    for (let t = 0; t <= attackSec; t += 0.001) {
      const envelope = (1 - Math.cos(Math.PI * (attackSec - t) / attackSec)) / 2;
      gainNode.gain.setValueAtTime(envelope * 0.3, now + durationSec - attackSec + t);
    }

    oscillator.start(now);
    oscillator.stop(now + durationSec);
  }

  playDot()    { this.playTone(this.timing.dotDuration); }
  playDash()   { this.playTone(this.timing.dotDuration * 3); }
  playBuzzer() { /* wrong answer - 150Hz square wave, 200ms */ }
  playExplosion() { /* 80Hz sawtooth + noise, 300ms */ }
}
```

### Step 5: Invader (`js/invader.js`)
```javascript
export class Invader {
  constructor(x, y, letter, morseCode, type)
  // Properties: x, y, letter, morseCode, type, currentSymbolIndex
  // Methods: advanceSymbol(), resetMorse(), get currentSymbol
}
```

### Step 6: Laser (`js/laser.js`)
```javascript
export class Laser {
  constructor(x, y, targetInvader)
  // Properties: x, y, target, active
  // Methods: update()
}
```

### Step 7: Explosion Animation (`js/explosion.js`)
```javascript
export class ExplosionAnimation {
  constructor(x, y)
  // Particle system with 8-12 particles
  // Properties: particles[], active, frame
  // Methods: update(deltaTime), isDone()
}
```

### Step 8: Renderer (`js/renderer.js`)
```javascript
export class Renderer {
  constructor(canvas)
  // Methods: clear(), drawPixelSprite(), drawInvader(), drawPlayer()
  // drawLaser(), drawExplosion(), drawMorseDisplay(), drawHUD()
  // drawMenu(), drawGameOver(), drawWrongFeedback()
}
```

### Step 9: Game (`js/game.js`)
```javascript
export class Game {
  constructor()
  // State: MENU, PLAYING, GAME_OVER
  // Properties: score, lives, level, wpm, learnedCharacters[], invaders[], lasers[], explosions[]
  // activeInvader (the lowest one spelling), typedBuffer
  // Methods: reset(), spawnWave(), getLowestInvaderPerLetter()
}
```

### Step 10: Game Loop (`js/game-loop.js`)
```javascript
export class GameLoop {
  constructor(game, renderer, audioEngine)
  start(), loop(), update(deltaTime), render()
}
```

### Step 11: Input Handler (`js/input-handler.js`)
```javascript
export class InputHandler {
  constructor(game, audioEngine)
  // Menu: arrows=WPM, type letters, Enter=start, Space=toggle audio
  // Playing: type letter=shoot (only lowest invader with that letter)
  // Wrong key: play buzzer, show red flash
}
```

### Step 12: Main (`js/main.js`)
Wire everything together, create instances, start game.

---

## Key Game Mechanics

### Morse Spelling - Lowest Invader Only
- Among all living invaders, find the **one with the greatest Y coordinate** (lowest on screen)
- **Only that invader** spells its morse code (audio + visual)
- When destroyed, the next lowest becomes active
- Each invader only spells its **own letter** - no two invaders spell simultaneously

### Letter Targeting Rule
- When player types a letter, only the **lowest alive invader with that letter** can be hit
- This prevents confusion and enforces the "read the morse, know the letter" mechanic

### Wrong Answer Feedback
- **Buzzer sound**: play immediately on wrong keypress
- **Red flash**: screen edge flashes red briefly (100ms)
- **No penalty** besides lost time

### Invader Hit Animation
- **Explosion particles**: 8-12 particles burst outward from hit location
- **Explosion sound**: low-frequency boom effect
- **Laser disappears**: laser traveling to target is removed
- **Invader removed**: marked destroyed, removed from active if was active

---

## Sound Effects (Web Audio API)

| Sound | Frequency | Duration | Character |
|-------|-----------|----------|-----------|
| Dot | 700 Hz sine | dotDuration | morse |
| Dash | 700 Hz sine | dashDuration * 3 | morse |
| Buzzer | 150 Hz square | 200ms | wrong answer |
| Explosion | 80 Hz sawtooth + noise | 300ms | invader destroyed |

---

## Menu UI
- Title with clickable character selection grid (A-Z)
- Click letters to toggle learned set (green = selected)
- WPM control with up/down buttons
- Audio toggle button
- START GAME button
- Arrow keys also work for WPM adjustment
- Settings persist in localStorage

## Settings Persistence
- localStorage key: `morseInvaderSettings`
- Saves: wpm, learnedCharacters[], audioEnabled
- Loads on startup, saves on any setting change

---

## Verification
1. Open in browser (serve via local server for ES6 modules)
2. Menu works: WPM adjustment, letter selection, Enter starts
3. Invaders spawn and descend
4. Only lowest invader Morse-codes its letter
5. Typing correct letter (lowest with that letter) → explosion animation + sound
6. Typing wrong letter → buzzer + red flash
7. Invader reaching bottom → lose life
8. All cleared → next level faster
9. 0 lives → Game Over
10. Enter → restart
