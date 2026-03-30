# Morse Invaders

A single-page web app game to learn Morse code.

## Main Host
https://fritzsche.github.io/morse_invaders

## Current Status

**Working Features:**
- Clickable character selection grid (A-Z) for learned characters
- WPM speed adjustment (5-30 WPM) with up/down buttons
- Audio toggle button
- Settings persist in localStorage
- Classic Space Invaders movement pattern (side-to-side, drop on edge hit)
- Homing laser that tracks target invader
- Explosion particle animation when invader is destroyed
- Sound effects with raised cosine envelope shaping (click-free morse tones)
- Buzzer sound for wrong letter input
- Red flash feedback for wrong answers
- 1-second delay before invader starts spelling morse code
- Wave system with 8 invaders (2 rows x 4 cols)

## How to Play

1. Open `index.html` in a browser (requires a local server for ES6 modules)
2. Click letters to select which characters you've learned
3. Adjust speed (WPM) with the up/down arrows
4. Press START GAME
5. The **lowest invader** (highest Y position) spells its morse code
6. Type the correct letter to shoot it before it reaches the bottom

## Controls

- **Click**: Select characters, adjust WPM, start game
- **Arrow Up/Down**: Adjust WPM
- **SPACE**: Toggle audio
- **ESC**: Return to menu during gameplay

## Technical Details

- Pure vanilla JavaScript (ES6 modules)
- No external dependencies
- Web Audio API for sound synthesis
- Canvas API for rendering
- Raised cosine envelope for click-free Morse code tones

## Running Locally

```bash
python3 -m http.server 8080
# Then open http://localhost:8080
```
