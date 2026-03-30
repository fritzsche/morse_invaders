import { GameState, MORSE_CODE } from './constants.js';

// InputHandler class - handles all keyboard and mouse input
export class InputHandler {
  constructor(game, audioEngine, gameLoop, renderer) {
    this.game = game;
    this.audioEngine = audioEngine;
    this.gameLoop = gameLoop;
    this.renderer = renderer;
    this.setupKeyboardListeners();
    this.setupClickListeners();
  }

  setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  setupClickListeners() {
    this.renderer.canvas.addEventListener('click', (e) => this.handleClick(e));
  }

  handleClick(e) {
    if (this.game.state !== GameState.MENU) return;

    const rect = this.renderer.canvas.getBoundingClientRect();
    const scaleX = this.renderer.canvas.width / rect.width;
    const scaleY = this.renderer.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check character buttons
    for (const btn of this.renderer.charButtons) {
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        this.game.toggleLearnedCharacter(btn.char);
        return;
      }
    }

    // Check WPM up button
    if (this.renderer.wpmButtons.up &&
        x >= this.renderer.wpmButtons.up.x &&
        x <= this.renderer.wpmButtons.up.x + this.renderer.wpmButtons.up.width &&
        y >= this.renderer.wpmButtons.up.y &&
        y <= this.renderer.wpmButtons.up.y + this.renderer.wpmButtons.up.height) {
      this.game.wpm = Math.min(30, this.game.wpm + 1);
      this.audioEngine.setWpm(this.game.wpm);
      this.game.saveSettings();
      return;
    }

    // Check WPM down button
    if (this.renderer.wpmButtons.down &&
        x >= this.renderer.wpmButtons.down.x &&
        x <= this.renderer.wpmButtons.down.x + this.renderer.wpmButtons.down.width &&
        y >= this.renderer.wpmButtons.down.y &&
        y <= this.renderer.wpmButtons.down.y + this.renderer.wpmButtons.down.height) {
      this.game.wpm = Math.max(5, this.game.wpm - 1);
      this.audioEngine.setWpm(this.game.wpm);
      this.game.saveSettings();
      return;
    }

    // Check audio button
    if (this.renderer.audioButton &&
        x >= this.renderer.audioButton.x &&
        x <= this.renderer.audioButton.x + this.renderer.audioButton.width &&
        y >= this.renderer.audioButton.y &&
        y <= this.renderer.audioButton.y + this.renderer.audioButton.height) {
      this.game.audioEnabled = !this.game.audioEnabled;
      this.audioEngine.setEnabled(this.game.audioEnabled);
      this.game.saveSettings();
      return;
    }

    // Check Morse Code display toggle button
    if (this.renderer.morseButton &&
        x >= this.renderer.morseButton.x &&
        x <= this.renderer.morseButton.x + this.renderer.morseButton.width &&
        y >= this.renderer.morseButton.y &&
        y <= this.renderer.morseButton.y + this.renderer.morseButton.height) {
      this.game.showMorseCode = !this.game.showMorseCode;
      this.game.saveSettings();
      return;
    }

    // Check start button
    if (this.renderer.startButton &&
        x >= this.renderer.startButton.x &&
        x <= this.renderer.startButton.x + this.renderer.startButton.width &&
        y >= this.renderer.startButton.y &&
        y <= this.renderer.startButton.y + this.renderer.startButton.height) {
      this.startGame();
      return;
    }
  }

  handleKeyDown(e) {
    // Prevent default for game keys
    if (['Enter', 'Space', 'ArrowUp', 'ArrowDown', 'Escape'].includes(e.code)) {
      e.preventDefault();
    }

    switch (this.game.state) {
      case GameState.MENU:
        this.handleMenuInput(e);
        break;
      case GameState.PLAYING:
        this.handlePlayingInput(e);
        break;
      case GameState.GAME_OVER:
        this.handleGameOverInput(e);
        break;
    }
  }

  handleMenuInput(e) {
    if (e.code === 'Enter') {
      this.startGame();
    } else if (e.code === 'Space') {
      this.game.audioEnabled = !this.game.audioEnabled;
      this.audioEngine.setEnabled(this.game.audioEnabled);
      this.game.saveSettings();
    } else if (e.code === 'ArrowUp') {
      this.game.wpm = Math.min(30, this.game.wpm + 1);
      this.audioEngine.setWpm(this.game.wpm);
      this.game.saveSettings();
    } else if (e.code === 'ArrowDown') {
      this.game.wpm = Math.max(5, this.game.wpm - 1);
      this.audioEngine.setWpm(this.game.wpm);
      this.game.saveSettings();
    }
  }

  handlePlayingInput(e) {
    if (e.code === 'Escape') {
      this.game.state = GameState.MENU;
      this.gameLoop.stop();
      return;
    }

    if (e.key.match(/^[a-zA-Z0-9]$/)) {
      const typed = e.key.toUpperCase();

      // Only accept letters that are in our learned set and have morse code
      if (!MORSE_CODE[typed]) return;

      this.game.typedBuffer += typed;

      // Find the lowest invader with this letter
      const targetInvader = this.game.getLowestInvaderForLetter(typed);

      if (targetInvader) {
        // Correct letter - fire laser!
        this.game.fireLaser(targetInvader);
        this.game.typedBuffer = '';
      } else {
        // Wrong letter (no invader with this letter)
        this.game.typedBuffer = this.game.typedBuffer.slice(0, -1); // remove just typed
        this.triggerWrongFeedback();
      }
    }
  }

  handleGameOverInput(e) {
    if (e.code === 'Enter') {
      this.game.reset();
      this.game.state = GameState.MENU;
    }
  }

  triggerWrongFeedback() {
    // Play buzzer sound
    this.audioEngine.playBuzzer();
    // Trigger red flash
    this.gameLoop.renderer.triggerWrongFeedback();
  }

  startGame() {
    this.game.reset();
    this.game.state = GameState.PLAYING;
    this.game.spawnWave();
    this.gameLoop.start();
  }
}
