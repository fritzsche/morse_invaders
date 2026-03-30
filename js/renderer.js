import { GameConfig, INVADER_SPRITES, PLAYER_SPRITE, MORSE_CODE } from './constants.js';

// Renderer class - handles all canvas drawing
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.wrongFlashAlpha = 0; // for red flash on wrong answer

    // Character button layout for menu
    this.charButtons = [];
    this.wpmButtons = { up: null, down: null };
    this.startButton = null;
    this.audioButton = null;
    this.morseButton = null;

    this.setupClickAreas();
  }

  setupClickAreas() {
    // Will be populated each frame since positions depend on text measurement
  }

  clear() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // Draw a pixel art sprite at position
  drawPixelSprite(sprite, x, y, scale = 3, color = '#00ff00') {
    this.ctx.fillStyle = color;
    const offsetX = -(sprite[0].length * scale) / 2;
    const offsetY = -(sprite.length * scale) / 2;

    for (let row = 0; row < sprite.length; row++) {
      for (let col = 0; col < sprite[row].length; col++) {
        if (sprite[row][col]) {
          this.ctx.fillRect(
            x + offsetX + col * scale,
            y + offsetY + row * scale,
            scale,
            scale
          );
        }
      }
    }
  }

  // Draw an invader
  drawInvader(invader, showMorse = true) {
    if (invader.isDestroyed) return;

    const sprite = INVADER_SPRITES[invader.type];
    const color = invader.isActive ? '#ff0000' : '#00ff00';
    this.drawPixelSprite(sprite, invader.x, invader.y, 3, color);

    // Draw morse code below active invader (not letter)
    if (invader.isActive) {
      this.drawMorseDisplay(invader, showMorse);
    }
  }

  // Draw the player's cannon
  drawPlayer(player) {
    const color = '#00ffff';
    this.drawPixelSprite(PLAYER_SPRITE, player.x, player.y, 3, color);
  }

  // Draw a laser projectile
  drawLaser(laser) {
    if (!laser.active) return;

    this.ctx.fillStyle = '#ffff00';
    this.ctx.fillRect(laser.x - 2, laser.y, 4, 15);

    // Add glow effect
    this.ctx.shadowColor = '#ffff00';
    this.ctx.shadowBlur = 10;
    this.ctx.fillRect(laser.x - 2, laser.y, 4, 15);
    this.ctx.shadowBlur = 0;
  }

  // Draw morse code display BELOW the invader, with dots and dashes on same baseline
  // Dots are circles, dashes are rectangles - all aligned at bottom
  drawMorseDisplay(invader, showMorse) {
    if (!showMorse) return;

    const morse = invader.displayedMorse;
    if (!morse) return;

    const dotRadius = 4;
    const dashWidth = 12;
    const dashHeight = 6;
    const spacing = 6; // space between symbols
    const baselineY = invader.y + invader.height / 2 + 15; // below the invader

    // Calculate total width to center the morse code
    let totalWidth = 0;
    for (const symbol of morse) {
      if (symbol === '.') {
        totalWidth += dotRadius * 2;
      } else if (symbol === '-') {
        totalWidth += dashWidth;
      }
      totalWidth += spacing;
    }
    totalWidth -= spacing; // remove trailing space

    let currentX = invader.x - totalWidth / 2;

    this.ctx.fillStyle = '#ffffff';

    for (const symbol of morse) {
      if (symbol === '.') {
        // Draw dot as a circle (filled)
        this.ctx.beginPath();
        this.ctx.arc(currentX + dotRadius, baselineY - dotRadius, dotRadius, 0, Math.PI * 2);
        this.ctx.fill();
        currentX += dotRadius * 2 + spacing;
      } else if (symbol === '-') {
        // Draw dash as a rectangle on the same baseline
        this.ctx.fillRect(currentX, baselineY - dashHeight, dashWidth, dashHeight);
        currentX += dashWidth + spacing;
      }
    }
  }

  // Draw explosion particles
  drawExplosion(explosion) {
    if (!explosion.active) return;

    for (const particle of explosion.particles) {
      if (particle.life > 0) {
        this.ctx.globalAlpha = particle.life;
        this.ctx.fillStyle = particle.color;
        this.ctx.fillRect(
          particle.x - particle.size / 2,
          particle.y - particle.size / 2,
          particle.size,
          particle.size
        );
      }
    }
    this.ctx.globalAlpha = 1;
  }

  // Draw the HUD (score, lives, level, WPM)
  drawHUD(score, lives, level, wpm, typedBuffer) {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${score}`, 20, 30);
    this.ctx.fillText(`LEVEL: ${level}`, 20, 50);
    this.ctx.fillText(`LIVES: ${'♥'.repeat(lives)}`, 20, 70);

    this.ctx.textAlign = 'right';
    this.ctx.fillText(`WPM: ${wpm}`, this.width - 20, 30);

    // Show typed buffer at bottom center
    this.ctx.fillStyle = '#00ff00';
    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.fillText(`TYPE: ${typedBuffer}`, this.width / 2, this.height - 20);
  }

  // Draw red flash for wrong answer
  drawWrongFeedback() {
    if (this.wrongFlashAlpha > 0) {
      this.ctx.fillStyle = `rgba(255, 0, 0, ${this.wrongFlashAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.wrongFlashAlpha -= 0.05; // fade out
    }
  }

  // Trigger red flash
  triggerWrongFeedback() {
    this.wrongFlashAlpha = 0.3;
  }

  // Draw the menu screen with clickable character selection
  drawMenu(learnedChars, wpm, audioEnabled, showMorseCode) {
    this.clear();
    this.charButtons = [];

    // Title
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = 'bold 36px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('MORSE CODE', this.width / 2, 60);
    this.ctx.fillText('SPACE INVADERS', this.width / 2, 100);

    // Subtitle
    this.ctx.fillStyle = '#888888';
    this.ctx.font = '14px monospace';
    this.ctx.fillText('Click letters/numbers to select learned characters', this.width / 2, 130);

    // Character selection grid - A-Z + 0-9 + punctuation
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?=';
    const btnWidth = 26;
    const btnHeight = 22;
    const btnSpacing = 4;
    const cols = 19;
    const startX = (this.width - (cols * (btnWidth + btnSpacing) - btnSpacing)) / 2;
    const gridY = 155;

    for (let i = 0; i < chars.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnWidth + btnSpacing);
      const y = gridY + row * (btnHeight + btnSpacing);
      const isSelected = learnedChars.includes(chars[i]);

      this.charButtons.push({
        char: chars[i],
        x: x,
        y: y,
        width: btnWidth,
        height: btnHeight,
        selected: isSelected
      });

      // Draw button
      if (isSelected) {
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(x, y, btnWidth, btnHeight);
        this.ctx.fillStyle = '#000000';
      } else {
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x, y, btnWidth, btnHeight);
        this.ctx.strokeStyle = '#666666';
        this.ctx.strokeRect(x, y, btnWidth, btnHeight);
        this.ctx.fillStyle = '#888888';
      }

      this.ctx.font = 'bold 14px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(chars[i], x + btnWidth / 2, y + btnHeight / 2 + 5);
    }

    // WPM control
    const wpmY = 340;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SPEED', this.width / 2, wpmY);

    const wpmBoxY = wpmY + 15;
    const wpmBoxWidth = 100;
    const wpmBoxHeight = 35;
    const wpmBoxX = this.width / 2 - wpmBoxWidth / 2;

    // WPM buttons
    const upBtnX = wpmBoxX + wpmBoxWidth + 10;
    const downBtnX = wpmBoxX - 40;
    const btnSize = 30;

    // Up button
    this.wpmButtons.up = { x: upBtnX, y: wpmBoxY, width: btnSize, height: btnSize };
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(upBtnX, wpmBoxY, btnSize, btnSize);
    this.ctx.strokeStyle = '#666666';
    this.ctx.strokeRect(upBtnX, wpmBoxY, btnSize, btnSize);
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.fillText('▲', upBtnX + btnSize / 2, wpmBoxY + btnSize / 2 + 7);

    // Down button
    this.wpmButtons.down = { x: downBtnX, y: wpmBoxY, width: btnSize, height: btnSize };
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(downBtnX, wpmBoxY, btnSize, btnSize);
    this.ctx.strokeStyle = '#666666';
    this.ctx.strokeRect(downBtnX, wpmBoxY, btnSize, btnSize);
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillText('▼', downBtnX + btnSize / 2, wpmBoxY + btnSize / 2 + 7);

    // WPM display box
    this.ctx.fillStyle = '#222222';
    this.ctx.fillRect(wpmBoxX, wpmBoxY, wpmBoxWidth, wpmBoxHeight);
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.strokeRect(wpmBoxX, wpmBoxY, wpmBoxWidth, wpmBoxHeight);
    this.ctx.fillStyle = '#ffcc00';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.fillText(`${wpm} WPM`, this.width / 2, wpmBoxY + wpmBoxHeight / 2 + 7);

    // Audio toggle
    const audioY = 410;
    this.audioButton = { x: this.width / 2 - 60, y: audioY, width: 120, height: 35 };
    this.ctx.fillStyle = audioEnabled ? '#00ff00' : '#ff0000';
    this.ctx.fillRect(this.audioButton.x, this.audioButton.y, this.audioButton.width, this.audioButton.height);
    this.ctx.fillStyle = audioEnabled ? '#000000' : '#ffffff';
    this.ctx.font = 'bold 16px monospace';
    this.ctx.fillText(`Audio ${audioEnabled ? 'ON' : 'OFF'}`, this.width / 2, audioY + 23);

    // Morse Code display toggle
    const morseY = audioY + 45;
    this.morseButton = { x: this.width / 2 - 60, y: morseY, width: 120, height: 35 };
    this.ctx.fillStyle = showMorseCode ? '#00ff00' : '#ff0000';
    this.ctx.fillRect(this.morseButton.x, this.morseButton.y, this.morseButton.width, this.morseButton.height);
    this.ctx.fillStyle = showMorseCode ? '#000000' : '#ffffff';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.fillText(`Morse ${showMorseCode ? 'ON' : 'OFF'}`, this.width / 2, morseY + 23);

    // Start button
    const startY = morseY + 55;
    this.startButton = { x: this.width / 2 - 100, y: startY, width: 200, height: 45 };
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillRect(this.startButton.x, this.startButton.y, this.startButton.width, this.startButton.height);
    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.fillText('START GAME', this.width / 2, startY + 30);
  }

  // Draw game over screen
  drawGameOver(score, level) {
    this.clear();

    this.ctx.fillStyle = '#ff0000';
    this.ctx.font = 'bold 48px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.width / 2, 200);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '24px monospace';
    this.ctx.fillText(`Final Score: ${score}`, this.width / 2, 280);
    this.ctx.fillText(`Level Reached: ${level}`, this.width / 2, 320);

    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '20px monospace';
    this.ctx.fillText('Press ENTER to Restart', this.width / 2, 400);
  }
}
