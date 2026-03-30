# Morse Invaders

## Context
Build a single-page web app game to learn Morse code, inspired by Space Invaders. Players must type the correct letter (matched to its Morse code broadcast by the active invader) before the invader reaches the bottom. User-configurable: learned character set and WPM speed.

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
└── CLAUDE.md           # This file
```

---

## ES6 Module Structure (one class per file)

| Module | Class | Responsibility |
|--------|-------|----------------|
| `constants.js` | - | MORSE_CODE dict, GameConfig, sprite data |
| `morse-timing.js` | `MorseTiming` | WPM-based timing calculations |
| `morse-audio.js` | `MorseAudioEngine` | Web Audio API: dots, dashes, buzzer, explosion |
| `invader.js` | `Invader` | Position, letter, morse state |
| `laser.js` | `Laser` | Position, velocity, target tracking |
| `explosion.js` | `ExplosionAnimation` | Particle-based explosion animation |
| `renderer.js` | `Renderer` | All canvas drawing |
| `game.js` | `Game` | State, score, lives, invaders, level progression |
| `game-loop.js` | `GameLoop` | requestAnimationFrame loop, morse spelling state machine |
| `input-handler.js` | `InputHandler` | Keyboard and mouse events |

---

## Key Game Mechanics

### Morse Spelling - Active Invader Only
- **One invader is active at a time** - randomly chosen from the lowest row
- Active invader is highlighted **red**; others are **green**
- Only the active invader spells its morse code (audio + visual)
- Visual morse display: dots (circles) and dashes (rectangles) drawn below the invader
- When destroyed, next invader from lowest row becomes active

### Shooting Mechanics
- Only the **active invader** can be shot
- Type the correct letter to fire a laser
- Wrong letter → buzzer sound + red screen flash
- ESC returns to menu

### Morse Timing (per invader)
| Phase | Delay |
|-------|-------|
| First invader of wave (first letter) | 100ms |
| First letter of subsequent invaders | 200ms |
| Letter repetition (2nd+ time) | 1000ms (time to type) |
| Between symbols (dot/dash) | symbolSpace |
| Between letters (on repeat) | letterSpace |

### Invader Movement (Classic Space Invaders Pattern)
- Invaders move **side to side as a group**
- When the group reaches a screen edge, ALL invaders **drop down** and **reverse direction**
- Movement speed increases as invaders are destroyed (authentic behavior)
- Speed also increases with level

### Difficulty Progression
| Level | Columns | Invaders |
|-------|---------|----------|
| 1 | 3 | 6 |
| 2 | 4 | 8 |
| 3+ | 5 | 10 (max) |

- `SPEED_INCREASE_PER_LEVEL = 0.22` (1.88x at level 5)

### Wrong Answer Feedback
- **Buzzer sound**: 150Hz square wave, 200ms
- **Red flash**: brief screen flash

### Invader Hit
- **Explosion particles**: 8-12 particles burst outward
- **Explosion sound**: 80Hz sawtooth + noise, 300ms
- **Laser disappears**: laser traveling to target is removed

---

## Sound Effects (Web Audio API)

| Sound | Frequency | Duration |
|-------|-----------|----------|
| Dot | 700 Hz sine | dotDuration |
| Dash | 700 Hz sine | dashDuration * 3 |
| Buzzer | 150 Hz square | 200ms |
| Explosion | 80 Hz sawtooth + noise | 300ms |

---

## Morse Code Character Set

Letters: A-Z
Numbers: 0-9
Punctuation: `.` (.-.-.-), `,` (--..--), `?` (..--..), `=` (-...-)

---

## Menu UI
- Title: "Morse Invaders"
- Clickable character selection grid (A-Z, 0-9, punctuation)
- Green = selected, gray = available but not selected
- WPM control (5-30) with up/down buttons
- Audio toggle (ON/OFF)
- Morse display toggle (ON/OFF) - show/hide dots and dashes
- START GAME button
- Instruction text: "Type the letter shown below the invader to shoot. ESC to end game."
- Settings persist in localStorage (`morseInvaderSettings`)

---

## Settings Persistence
- localStorage key: `morseInvaderSettings`
- Saves: wpm, learnedCharacters[], audioEnabled, showMorseCode
- Loads on startup, saves on any setting change
