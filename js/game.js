import { GameConfig, GameState, DEFAULT_LEARNED_CHARS, MORSE_CODE } from './constants.js';
import { Invader } from './invader.js';
import { Laser } from './laser.js';
import { ExplosionAnimation } from './explosion.js';

// Game class - manages game state and logic
export class Game {
  constructor() {
    this.state = GameState.MENU;
    this.score = 0;
    this.lives = GameConfig.INITIAL_LIVES;
    this.level = 1;
    this.wpm = 15;
    this.learnedCharacters = [...DEFAULT_LEARNED_CHARS];
    this.invaders = [];
    this.lasers = [];
    this.explosions = [];
    this.activeInvader = null;
    this.typedBuffer = '';
    this.audioEnabled = true;
    this.player = {
      x: GameConfig.CANVAS_WIDTH / 2,
      y: GameConfig.CANVAS_HEIGHT - 50,
      width: 33,
      height: 24
    };

    // Load saved settings
    this.loadSettings();
  }

  // Save settings to localStorage
  saveSettings() {
    const settings = {
      wpm: this.wpm,
      learnedCharacters: this.learnedCharacters,
      audioEnabled: this.audioEnabled
    };
    localStorage.setItem('morseInvaderSettings', JSON.stringify(settings));
  }

  // Load settings from localStorage
  loadSettings() {
    try {
      const saved = localStorage.getItem('morseInvaderSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.wpm && settings.wpm >= 5 && settings.wpm <= 30) {
          this.wpm = settings.wpm;
        }
        if (settings.learnedCharacters && Array.isArray(settings.learnedCharacters) && settings.learnedCharacters.length >= 2) {
          this.learnedCharacters = settings.learnedCharacters;
        }
        if (typeof settings.audioEnabled === 'boolean') {
          this.audioEnabled = settings.audioEnabled;
        }
      }
    } catch (e) {
      console.warn('Could not load saved settings:', e);
    }
  }

  // Reset game state for new game
  reset() {
    this.score = 0;
    this.lives = GameConfig.INITIAL_LIVES;
    this.level = 1;
    this.invaders = [];
    this.lasers = [];
    this.explosions = [];
    this.activeInvader = null;
    this.typedBuffer = '';
    this.player.x = GameConfig.CANVAS_WIDTH / 2;
  }

  // Spawn a wave of invaders
  spawnWave() {
    this.invaders = [];
    this.lasers = [];
    this.activeInvader = null;

    const startX = (GameConfig.CANVAS_WIDTH - (GameConfig.INVADER_COLS - 1) * GameConfig.INVADER_SPACING_X) / 2;
    const startY = GameConfig.INVADER_START_Y;

    const types = ['type1', 'type2', 'type3'];

    for (let row = 0; row < GameConfig.INVADER_ROWS; row++) {
      for (let col = 0; col < GameConfig.INVADER_COLS; col++) {
        const letter = this.learnedCharacters[
          Math.floor(Math.random() * this.learnedCharacters.length)
        ];
        const type = types[row % 3];
        const x = startX + col * GameConfig.INVADER_SPACING_X;
        const y = startY + row * GameConfig.INVADER_SPACING_Y;

        this.invaders.push(new Invader(x, y, letter, type));
      }
    }

    // Activate the lowest invader for morse spelling
    this.activateLowestInvader();
  }

  // Get the lowest (highest Y) living invader for a specific letter
  getLowestInvaderForLetter(letter) {
    const matching = this.invaders.filter(
      inv => !inv.isDestroyed && inv.letter === letter
    );
    if (matching.length === 0) return null;

    // Return the one with highest Y (lowest on screen)
    return matching.reduce((lowest, inv) =>
      inv.y > lowest.y ? inv : lowest
    );
  }

  // Get the lowest living invader overall
  getLowestInvader() {
    const living = this.invaders.filter(inv => !inv.isDestroyed);
    if (living.length === 0) return null;

    return living.reduce((lowest, inv) =>
      inv.y > lowest.y ? inv : lowest
    );
  }

  // Activate the lowest invader for morse spelling
  activateLowestInvader() {
    // Deactivate current active invader
    if (this.activeInvader) {
      this.activeInvader.resetMorse();
    }

    this.activeInvader = this.getLowestInvader();
    if (this.activeInvader) {
      this.activeInvader.isActive = true;
      this.activeInvader.currentSymbolIndex = 0;
    }
  }

  // Get descent speed based on current level
  getDescentSpeed() {
    return GameConfig.BASE_DESCENT_SPEED +
           (this.level - 1) * GameConfig.SPEED_INCREASE_PER_LEVEL;
  }

  // Update all invaders (descent)
  // deltaTime is in milliseconds, normalize to 60fps (16.67ms per frame)
  updateInvaders(deltaTime) {
    const baseSpeed = this.getDescentSpeed();
    // Normalize speed to 60fps
    const normalizedDelta = deltaTime / 16.67;
    const speed = baseSpeed * normalizedDelta;

    for (const invader of this.invaders) {
      if (!invader.isDestroyed) {
        invader.y += speed;
      }
    }
  }

  // Check if any invader reached the bottom
  checkInvadersReachedBottom() {
    const bottomLine = GameConfig.CANVAS_HEIGHT - 100;

    for (const invader of this.invaders) {
      if (!invader.isDestroyed && invader.y >= bottomLine) {
        this.lives--;
        return true;
      }
    }
    return false;
  }

  // Check if wave is cleared
  isWaveCleared() {
    return this.invaders.every(inv => inv.isDestroyed);
  }

  // Shoot an invader (laser hits)
  shootInvader(invader) {
    // Mark invader as destroyed
    invader.isDestroyed = true;
    invader.isActive = false;

    // Create explosion at invader position
    this.explosions.push(new ExplosionAnimation(invader.x, invader.y));

    // Add score
    this.score += GameConfig.POINTS_PER_INVADER;

    // Check if wave cleared
    if (this.isWaveCleared()) {
      this.score += GameConfig.WAVE_CLEAR_BONUS;
      this.level++;
      this.spawnWave();
    } else {
      // Activate next lowest invader
      this.activateLowestInvader();
    }
  }

  // Fire a laser at target invader
  fireLaser(targetInvader) {
    const laser = new Laser(this.player.x, this.player.y, targetInvader);
    this.lasers.push(laser);
  }

  // Update all lasers
  updateLasers() {
    for (const laser of this.lasers) {
      if (!laser.active) continue;

      // If target is destroyed, remove laser
      if (!laser.target || laser.target.isDestroyed) {
        laser.active = false;
        continue;
      }

      laser.update();

      // Check collision with target
      if (laser.checkCollision(laser.target)) {
        laser.active = false;
        this.shootInvader(laser.target);
      }
    }

    // Remove inactive lasers
    this.lasers = this.lasers.filter(l => l.active);
  }

  // Update all explosions
  updateExplosions(deltaTime) {
    for (const explosion of this.explosions) {
      explosion.update(deltaTime);
    }
    this.explosions = this.explosions.filter(e => !e.isDone());
  }

  // Toggle a character in learned set
  toggleLearnedCharacter(char) {
    const upperChar = char.toUpperCase();
    const index = this.learnedCharacters.indexOf(upperChar);
    if (index >= 0) {
      // Don't allow removing if less than 2 characters
      if (this.learnedCharacters.length > 2) {
        this.learnedCharacters.splice(index, 1);
        this.saveSettings();
      }
    } else {
      // Only add if it's a valid morse code character
      if (MORSE_CODE[upperChar]) {
        this.learnedCharacters.push(upperChar);
        this.learnedCharacters.sort();
        this.saveSettings();
      }
    }
  }
}
