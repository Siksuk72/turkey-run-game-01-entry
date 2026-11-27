// Giblet the turkey: physics, stumble, hiding and the shield.
// The turkey stays at a fixed screen x; the world scrolls under it. The
// turkey's state is small on purpose: y (height above ground), vertical
// velocity, whether it is on the ground, ducking, hiding, and how many
// feathers it has left to lose.

import { PLAYER, GROUND_Y } from './config.js';

export class Turkey {
  constructor() {
    this.x = PLAYER.x;
    this.y = 0; // height above the ground, px; 0 = feet on the ground
    this.vy = 0;
    this.onGround = true;
    this.jumpsUsed = 0; // double jump: one fresh jump in mid-air
    this.ducking = false;
    this.hiding = false;
    this.hidden = false; // actually inside a haystack right now
    this.shield = false; // a gravy boat is riding along
    this.stumbleT = 0; // seconds of wobble after a hit
    this.runPhase = 0; // leg-cycle phase for the walk animation
    this.facing = 1;
  }

  get w() {
    return PLAYER.w;
  }

  get h() {
    return this.ducking ? PLAYER.h * 0.62 : PLAYER.h;
  }

  // Screen-space bounding box, used for collisions.
  get box() {
    return {
      x: this.x - this.w / 2,
      y: GROUND_Y - this.y - this.h,
      w: this.w,
      h: this.h,
    };
  }

  get feetY() {
    return GROUND_Y - this.y;
  }

  reset() {
    this.y = 0;
    this.vy = 0;
    this.onGround = true;
    this.jumpsUsed = 0;
    this.ducking = false;
    this.hiding = false;
    this.hidden = false;
    this.shield = false;
    this.stumbleT = 0;
    this.runPhase = 0;
  }

  // Jump from the ground, or one fresh double jump in mid-air. A turkey
  // that can flap twice clears tight pairs of ovens and fences.
  tryJump(sounds) {
    if (this.hiding) return false;
    if (this.onGround) {
      this.vy = PLAYER.jumpV;
      this.onGround = false;
      this.jumpsUsed = 1;
    } else if (this.jumpsUsed < 2) {
      this.vy = PLAYER.jumpV * 0.8;
      this.jumpsUsed = 2;
    } else {
      return false;
    }
    this.ducking = false;
    if (sounds) sounds.jump();
    return true;
  }

  // dt seconds, speedPx = world scroll speed right now.
  update(dt, speedPx, input) {
    this.ducking = input.down && this.onGround && !this.hiding;
    if (!this.onGround) {
      // y is height above the ground (positive up): gravity pulls vy down.
      this.vy -= PLAYER.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.onGround = true;
        this.jumpsUsed = 0;
      }
    }
    // Legs only cycle while running on the ground.
    if (this.onGround && !this.ducking && !this.hiding) {
      this.runPhase += dt * (speedPx / 28);
    }
    // After popping out of a haystack, run back to the usual spot.
    if (!this.hiding && this.x < PLAYER.x) {
      this.x = Math.min(PLAYER.x, this.x + 620 * dt);
    }
    if (this.stumbleT > 0) this.stumbleT -= dt;
  }

  stumble() {
    this.stumbleT = 0.7;
  }

  get stumbling() {
    return this.stumbleT > 0;
  }
}
