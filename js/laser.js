import { GameConfig } from './constants.js';

// Laser class - projectile fired by player to destroy invaders
export class Laser {
  constructor(x, y, targetInvader) {
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.width = 4;
    this.height = 15;
    this.speed = GameConfig.LASER_SPEED;
    this.target = targetInvader;
    this.active = true;
  }

  // Update laser position, homing toward target
  update() {
    if (!this.active || !this.target || this.target.isDestroyed) {
      this.active = false;
      return;
    }

    // Calculate direction to target
    const targetX = this.target.x;
    const targetY = this.target.y;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If close enough to target, we've hit it
    if (distance < 20) {
      return; // Let collision detection handle it
    }

    // Normalize direction and move
    const vx = (dx / distance) * this.speed;
    const vy = (dy / distance) * this.speed;

    this.x += vx;
    this.y += vy;

    // If off screen, deactivate
    if (this.y < -this.height || this.y > 700 ||
        this.x < -this.width || this.x > 900) {
      this.active = false;
    }
  }

  // Check collision with target invader
  checkCollision(invader) {
    if (!this.active || !invader || invader.isDestroyed) return false;

    const invaderLeft = invader.x - invader.width / 2;
    const invaderRight = invader.x + invader.width / 2;
    const invaderTop = invader.y - invader.height / 2;
    const invaderBottom = invader.y + invader.height / 2;

    const laserLeft = this.x - this.width / 2;
    const laserRight = this.x + this.width / 2;
    const laserTop = this.y - this.height / 2;
    const laserBottom = this.y + this.height / 2;

    return laserLeft < invaderRight &&
           laserRight > invaderLeft &&
           laserTop < invaderBottom &&
           laserBottom > invaderTop;
  }
}
