// ExplosionAnimation class - particle-based explosion effect
export class ExplosionAnimation {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.particles = [];
    this.active = true;
    this.frame = 0;
    this.maxFrames = 30; // animation lasts 30 frames

    // Create 10 particles
    const numParticles = 10;
    for (let i = 0; i < numParticles; i++) {
      const angle = (Math.PI * 2 / numParticles) * i + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: this._getParticleColor(i),
        life: 1.0,
        decay: 0.02 + Math.random() * 0.02
      });
    }
  }

  _getParticleColor(index) {
    // Orange/yellow/red gradient for explosion
    const colors = ['#ff6600', '#ff9900', '#ffcc00', '#ff3300', '#ffff00'];
    return colors[index % colors.length];
  }

  // Update particle positions and life
  update(deltaTime) {
    if (!this.active) return;

    this.frame++;

    if (this.frame >= this.maxFrames) {
      this.active = false;
      return;
    }

    for (const particle of this.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      // Add slight gravity
      particle.vy += 0.1;
      particle.life -= particle.decay;
      particle.size *= 0.97; // shrink over time
    }
  }

  // Check if animation is done
  isDone() {
    return !this.active;
  }
}

// PlayerExplosionAnimation - larger, more dramatic explosion for player death
export class PlayerExplosionAnimation {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.particles = [];
    this.active = true;
    this.frame = 0;
    this.maxFrames = 45; // longer animation

    // Create 20 particles - more dramatic
    const numParticles = 20;
    for (let i = 0; i < numParticles; i++) {
      const angle = (Math.PI * 2 / numParticles) * i + Math.random() * 0.5;
      const speed = 3 + Math.random() * 5;
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 6,
        color: this._getParticleColor(i),
        life: 1.0,
        decay: 0.015 + Math.random() * 0.015
      });
    }
  }

  _getParticleColor(index) {
    // Bright orange/yellow/white for player explosion (more heroic)
    const colors = ['#ffffff', '#ffff00', '#ffcc00', '#ff9900', '#ff6600', '#ff3300'];
    return colors[index % colors.length];
  }

  update(deltaTime) {
    if (!this.active) return;

    this.frame++;

    if (this.frame >= this.maxFrames) {
      this.active = false;
      return;
    }

    for (const particle of this.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      // Add slight gravity
      particle.vy += 0.08;
      particle.life -= particle.decay;
      particle.size *= 0.96;
    }
  }

  isDone() {
    return !this.active;
  }
}
