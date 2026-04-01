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
    // States: 'IDLE' | 'PLAYING_LETTER' | 'LETTER_SPACE_WAIT'
    // IDLE            → scheduleLetter() called → PLAYING_LETTER
    // PLAYING_LETTER  → driven by worklet ack messages via _handleWorkletMessage()
    //                 → on 'letterComplete' → LETTER_SPACE_WAIT
    // LETTER_SPACE_WAIT → deltaTime wait → IDLE
    this.morseTimer = 0;
    this.morseState = 'IDLE';
    this.waitingForStart = true;       // delay before first schedule after becoming active
    this.isFirstInvader = true;        // flag for first invader of wave (shorter delay)
    this.waitingForLetterRepeat = false; // true after first letter (1s gap on repeat)
    this.lastActiveInvader = null;     // tracks invader reference to detect changes
    this.suppressMorse = false;        // silences new tones while laser is in flight

    // Wire worklet ack messages to this state machine
    this.audioEngine.setWorkletMessageHandler((msg) => this._handleWorkletMessage(msg));
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

    // If dying, only update explosions and handle death sequence
    if (this.game.isDying) {
      this.game.updateExplosions(deltaTime);
      this.game.updateDeathSequence(deltaTime);
      return;
    }

    // Update invaders descent
    this.game.updateInvaders(deltaTime);

    // Check if invaders reached bottom
    if (this.game.checkInvadersReachedBottom()) {
      return; // isDying flag is now set
    }

    // Update lasers first so a kill is resolved before morse state runs
    this.game.updateLasers();

    // Update morse spelling
    this.updateMorseSpelling(deltaTime);

    // Update explosions
    this.game.updateExplosions(deltaTime);
  }

  // Called by audioEngine when the worklet posts a message.
  // Updates invader visual state and advances morseState.
  _handleWorkletMessage(msg) {
    const invader = this.game.activeInvader;
    if (!invader || invader.isDestroyed) return;

    switch (msg.type) {
      case 'symbolStart':
        invader.playingSymbolIndex = msg.index;
        break;

      case 'symbolEnd':
        invader.playingSymbolIndex = -1;
        invader.currentSymbolIndex = msg.index + 1;
        break;

      case 'letterComplete':
        // Guard: ignore stale acks (e.g. after tab was backgrounded)
        if (this.morseState === 'PLAYING_LETTER') {
          invader.hasPlayedFullMorse = true;
          invader.currentSymbolIndex = 0;
          invader.playingSymbolIndex = -1;
          this.morseState = 'LETTER_SPACE_WAIT';
          this.morseTimer = 0;
          this.waitingForLetterRepeat = true;
        }
        break;
    }
  }

  updateMorseSpelling(deltaTime) {
    // Check if new wave started - reset first invader flag
    if (this.game.newWave) {
      this.game.newWave = false;
      this.isFirstInvader = true;
      this.lastActiveInvader = null; // force invader-change detection below
    }

    const invader = this.game.activeInvader;
    if (!invader || invader.isDestroyed) {
      if (this.lastActiveInvader !== null) {
        this.audioEngine.stopAll();
        this.lastActiveInvader = null;
        this.morseState = 'IDLE';
      }
      return;
    }

    // Active invader changed — stop current audio and reset state machine
    if (invader !== this.lastActiveInvader) {
      this.lastActiveInvader = invader;
      this.suppressMorse = false; // new invader: resume audio
      this.audioEngine.stopAll();
      this.resetMorseState();
    }

    if (!this.audioEngine.timing) return;

    // Short delay before scheduling the first (or next) letter.
    // waitingForLetterRepeat uses 1000ms to give the player time to type.
    // isFirstInvader uses 100ms (almost instant start to wave).
    // All other transitions use 200ms.
    if (this.waitingForStart) {
      this.morseTimer += deltaTime;
      const waitDuration = this.waitingForLetterRepeat ? 1000
                         : this.isFirstInvader          ? 100
                         : 200;
      if (this.morseTimer < waitDuration) return;
      this.waitingForStart = false;
      this.isFirstInvader = false;
      this.morseTimer = 0;
    }

    switch (this.morseState) {
      case 'IDLE':
        // Schedule the full letter on the worklet and wait for ack messages
        if (!this.suppressMorse && this.game.audioEnabled) {
          this.audioEngine.scheduleLetter(invader.morseCode, this.audioEngine.timing);
        }
        this.morseState = 'PLAYING_LETTER';
        break;

      case 'PLAYING_LETTER':
        // Entirely driven by _handleWorkletMessage — nothing to poll here
        break;

      case 'LETTER_SPACE_WAIT':
        // Wait between repetitions (already entered via _handleWorkletMessage letterComplete)
        this.morseTimer += deltaTime;
        if (this.morseTimer >= (this.waitingForLetterRepeat ? 1000 : 200)) {
          this.morseTimer = 0;
          this.waitingForLetterRepeat = false;
          this.morseState = 'IDLE';
          // Let IDLE fire on the very next tick (waitingForStart was cleared above)
        }
        break;
    }
  }

  resetMorseState() {
    this.morseTimer = 0;
    this.morseState = 'IDLE';
    this.waitingForStart = true;
    this.waitingForLetterRepeat = false;
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

    // Draw player (not when dying)
    if (!this.game.isDying) {
      this.renderer.drawPlayer(this.game.player);
    }

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
