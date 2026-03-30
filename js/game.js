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
    this.showMorseCode = true; // show/hide morse code display
    this.audioEngine = null; // set by GameLoop
    this.newWave = false; // set true when wave starts, cleared by game-loop
    this.player = {
      x: GameConfig.CANVAS_WIDTH / 2,
      y: GameConfig.CANVAS_HEIGHT - 50,
      width: 33,
      height: 24
    };

    // Invader group movement (classic Space Invaders style)
    this.invaderDirection = 1; // 1 = right, -1 = left
    this.initialInvaderCount = 0;

    // Load saved settings
    this.loadSettings();
  }

  // Save settings to localStorage
  saveSettings() {
    const settings = {
      wpm: this.wpm,
      learnedCharacters: this.learnedCharacters,
      audioEnabled: this.audioEnabled,
      showMorseCode: this.showMorseCode
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
        if (typeof settings.showMorseCode === 'boolean') {
          this.showMorseCode = settings.showMorseCode;
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
    this.invaderDirection = 1; // Reset to moving right

    // Level-based column count: 3 at level 1, up to 5 at level 3+
    const cols = Math.min(5, Math.max(3, 1 + this.level));
    const startX = (GameConfig.CANVAS_WIDTH - (cols - 1) * GameConfig.INVADER_SPACING_X) / 2;
    const startY = GameConfig.INVADER_START_Y;

    const types = ['type1', 'type2', 'type3'];

    for (let row = 0; row < GameConfig.INVADER_ROWS; row++) {
      for (let col = 0; col < cols; col++) {
        const letter = this.learnedCharacters[
          Math.floor(Math.random() * this.learnedCharacters.length)
        ];
        const type = types[row % 3];
        const x = startX + col * GameConfig.INVADER_SPACING_X;
        const y = startY + row * GameConfig.INVADER_SPACING_Y;

        this.invaders.push(new Invader(x, y, letter, type));
      }
    }

    this.initialInvaderCount = this.invaders.length;
    this.newWave = true; // signal game-loop that new wave started

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

  // Get all living invaders at the lowest row (highest Y)
  getLowestRow() {
    const living = this.invaders.filter(inv => !inv.isDestroyed);
    if (living.length === 0) return [];

    // Find the maximum Y (lowest row)
    const maxY = Math.max(...living.map(inv => inv.y));
    // Return all invaders at that Y level
    return living.filter(inv => inv.y === maxY);
  }

  // Activate a random invader from the lowest row for morse spelling
  activateLowestInvader() {
    // Deactivate current active invader
    if (this.activeInvader) {
      this.activeInvader.resetMorse();
    }

    const lowestRow = this.getLowestRow();
    if (lowestRow.length === 0) {
      this.activeInvader = null;
      return;
    }

    // Pick a random invader from the lowest row
    this.activeInvader = lowestRow[Math.floor(Math.random() * lowestRow.length)];
    this.activeInvader.isActive = true;
    this.activeInvader.currentSymbolIndex = 0;
    this.activeInvader.playingSymbolIndex = -1; // ensure nothing playing
    this.activeInvader.hasPlayedFullMorse = false; // start fresh
  }

  // Get current movement speed based on level and remaining invaders
  // Classic Space Invaders: fewer invaders = faster movement
  getInvaderSpeed() {
    const livingCount = this.invaders.filter(inv => !inv.isDestroyed).length;
    const levelMultiplier = 1 + (this.level - 1) * GameConfig.SPEED_INCREASE_PER_LEVEL;

    // Speed increases as invaders are destroyed (fewer to animate)
    const destructionFactor = this.initialInvaderCount / Math.max(livingCount, 1);

    return GameConfig.INVADER_HORIZONTAL_SPEED * levelMultiplier * Math.sqrt(destructionFactor);
  }

  // Update all invaders - classic side-to-side movement
  // deltaTime is in milliseconds, normalize to 60fps (16.67ms per frame)
  updateInvaders(deltaTime) {
    const livingInvaders = this.invaders.filter(inv => !inv.isDestroyed);
    if (livingInvaders.length === 0) return;

    const normalizedDelta = deltaTime / 16.67;
    const speed = this.getInvaderSpeed() * normalizedDelta;

    // Find the leftmost and rightmost living invaders
    let leftMost = null;
    let rightMost = null;
    for (const invader of livingInvaders) {
      if (!leftMost || invader.x < leftMost.x) leftMost = invader;
      if (!rightMost || invader.x > rightMost.x) rightMost = invader;
    }

    // Check if we need to reverse direction
    const margin = GameConfig.INVADER_MARGIN;
    const leftEdge = leftMost ? leftMost.x - leftMost.width / 2 : margin;
    const rightEdge = rightMost ? rightMost.x + rightMost.width / 2 : GameConfig.CANVAS_WIDTH - margin;

    let shouldReverse = false;

    if (this.invaderDirection > 0 && rightEdge >= GameConfig.CANVAS_WIDTH - margin) {
      // Moving right and hit right edge
      shouldReverse = true;
    } else if (this.invaderDirection < 0 && leftEdge <= margin) {
      // Moving left and hit left edge
      shouldReverse = true;
    }

    if (shouldReverse) {
      // Drop down and reverse
      this.invaderDirection *= -1;
      for (const invader of livingInvaders) {
        invader.y += GameConfig.INVADER_DROP_AMOUNT;
      }
    } else {
      // Move sideways
      for (const invader of livingInvaders) {
        invader.x += speed * this.invaderDirection;
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

    // Play explosion sound to fill gap before next morse starts
    if (this.audioEnabled && this.audioEngine) {
      this.audioEngine.playExplosion();
    }

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
