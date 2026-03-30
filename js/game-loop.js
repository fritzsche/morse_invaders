import { GameState } from './constants.js';

// GameLoop class - handles the game loop via requestAnimationFrame
export class GameLoop {
  constructor(game, renderer, audioEngine) {
    this.game = game;
    this.renderer = renderer;
    this.audioEngine = audioEngine;
    this.game.audioEngine = audioEngine; // wire up Game's audio reference
    this.lastTime = 0;
    this.animationId = null;

    // Morse spelling state
    this.morseTimer = 0;
    this.currentSymbolDuration = 0;
    this.isPlayingSymbol = false;
    this.isPlayingSpace = false;
    this.spaceTimer = 0;
    this.morseState = 'IDLE'; // IDLE, PLAY_SYMBOL, SYMBOL_SPACE, LETTER_SPACE
    this.waitingForStart = true;
    this.isFirstInvader = true; // flag for first invader of wave
    this.waitingForLetterRepeat = false; // flag: true after first letter, for 1s gap on repeat

    this.resetMorseState();
  }

  start() {
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  loop() {
    const currentTime = performance.now();
    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Cap deltaTime to prevent issues when tab is backgrounded
    if (deltaTime > 100) deltaTime = 16;

    this.update(deltaTime);
    this.render();

    // Always continue looping for menu rendering
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  update(deltaTime) {
    if (this.game.state !== GameState.PLAYING) return;

    // Update invaders descent
    this.game.updateInvaders(deltaTime);

    // Check if invaders reached bottom
    if (this.game.checkInvadersReachedBottom()) {
      if (this.game.lives <= 0) {
        this.game.state = GameState.GAME_OVER;
      } else {
        // Reset invaders for new life
        this.game.spawnWave();
      }
    }

    // Update morse spelling
    this.updateMorseSpelling(deltaTime);

    // Update lasers
    this.game.updateLasers();

    // Update explosions
    this.game.updateExplosions(deltaTime);
  }

  updateMorseSpelling(deltaTime) {
    // Check if new wave started - reset first invader flag
    if (this.game.newWave) {
      this.game.newWave = false;
      this.isFirstInvader = true;
    }

    const activeInvader = this.game.activeInvader;
    if (!activeInvader || activeInvader.isDestroyed) {
      this.game.activateLowestInvader();
      // Always reset morse state when switching/activating invader
      this.resetMorseState();
      return;
    }

    const timing = this.audioEngine.timing;
    if (!timing) return;

    // Check if we need to wait before starting (short delay after becoming active or after completing a letter)
    if (this.waitingForStart) {
      this.morseTimer += deltaTime;
      let waitDuration = 200; // default short delay
      if (this.waitingForLetterRepeat) {
        waitDuration = 1000; // letter repetition - give user time to type
      } else if (this.isFirstInvader) {
        waitDuration = 100; // first invader of wave - almost instant
      }
      if (this.morseTimer >= waitDuration) {
        this.waitingForStart = false;
        this.isFirstInvader = false; // next invader gets short delay instead
        this.morseTimer = 0;
        this.isPlayingSymbol = false;
        this.isPlayingSpace = false;
        // Don't return - continue to process
      } else {
        return; // Wait before starting
      }
    }

    const currentSymbol = activeInvader.currentSymbol;

    // State machine for morse spelling
    switch (this.morseState) {
      case 'IDLE':
        if (currentSymbol) {
          this.morseState = 'PLAY_SYMBOL';
          this.morseTimer = 0;
        }
        break;

      case 'PLAY_SYMBOL':
        if (!this.isPlayingSymbol) {
          // Start playing a symbol
          this.isPlayingSymbol = true;
          this.currentSymbolDuration = currentSymbol === '.' ?
            timing.dotDuration : timing.dotDuration * 3;

          // Mark which symbol is playing (for display)
          activeInvader.playingSymbolIndex = activeInvader.currentSymbolIndex;

          // Play the tone
          if (this.game.audioEnabled) {
            if (currentSymbol === '.') {
              this.audioEngine.playDot();
            } else {
              this.audioEngine.playDash();
            }
          }
        }

        this.morseTimer += deltaTime;
        if (this.morseTimer >= this.currentSymbolDuration) {
          // Symbol finished
          this.isPlayingSymbol = false;
          this.morseTimer = 0;
          activeInvader.playingSymbolIndex = -1; // clear playing indicator

          // Move to next symbol or end of letter
          if (!activeInvader.advanceSymbol()) {
            // No more symbols - letter complete
            this.morseState = 'LETTER_SPACE';
          } else {
            // More symbols - inter-symbol space
            this.morseState = 'SYMBOL_SPACE';
          }
        }
        break;

      case 'SYMBOL_SPACE':
        this.morseTimer += deltaTime;
        if (this.morseTimer >= timing.symbolSpace) {
          this.morseTimer = 0;
          this.morseState = 'PLAY_SYMBOL';
        }
        break;

      case 'LETTER_SPACE':
        this.morseTimer += deltaTime;
        if (this.morseTimer >= timing.letterSpace) {
          // Reset to beginning and wait before repeating
          activeInvader.currentSymbolIndex = 0;
          this.morseTimer = 0;
          this.waitingForStart = true; // Wait before starting again
          this.waitingForLetterRepeat = true; // mark that first letter is done, now repeating
          this.morseState = 'IDLE';
        }
        break;
    }
  }

  resetMorseState() {
    this.morseTimer = 0;
    this.isPlayingSymbol = false;
    this.isPlayingSpace = false;
    this.morseState = 'IDLE';
    this.waitingForStart = true; // Wait before starting
    this.waitingForLetterRepeat = false; // will be set true after first letter completes
  }

  render() {
    if (this.game.state === GameState.MENU) {
      this.renderer.drawMenu(
        this.game.learnedCharacters,
        this.game.wpm,
        this.game.audioEnabled,
        this.game.showMorseCode
      );
      return;
    }

    if (this.game.state === GameState.GAME_OVER) {
      this.renderer.drawGameOver(this.game.score, this.game.level);
      return;
    }

    // Clear and draw game elements
    this.renderer.clear();

    // Draw invaders
    for (const invader of this.game.invaders) {
      this.renderer.drawInvader(invader, this.game.showMorseCode);
    }

    // Draw player
    this.renderer.drawPlayer(this.game.player);

    // Draw lasers
    for (const laser of this.game.lasers) {
      this.renderer.drawLaser(laser);
    }

    // Draw explosions
    for (const explosion of this.game.explosions) {
      this.renderer.drawExplosion(explosion);
    }

    // Draw HUD
    this.renderer.drawHUD(
      this.game.score,
      this.game.lives,
      this.game.level,
      this.game.wpm,
      this.game.typedBuffer
    );

    // Draw wrong feedback flash
    this.renderer.drawWrongFeedback();
  }
}
