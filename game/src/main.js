// Giblet's Great Escape — the game loop and the rules.
// States: title -> playing -> caught / escaped, with pause. The loop owns
// the score, the distance, the farmer gap, collisions and particles; the
// renderer only draws what this file hands it. ?shot=start|play|kitchen|end
// renders one fixed frame for screenshots; ?selftest=1 runs the loop
// headlessly and reports the result into #selftest-out.

import {
  VIEW_W,
  VIEW_H,
  GROUND_Y,
  RUN_LENGTH_M,
  METRES_PER_PX,
  PLAYER,
  FARMER,
  LIVES,
  SCORE,
  STAGES,
} from './config.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { Turkey } from './turkey.js';
import { Farmer } from './farmer.js';
import { World, overlaps, entityBox } from './world.js';
import * as R from './render.js';
import { setupShot, runSelfTest } from './shots.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sounds = new SoundBank();
    this.turkey = new Turkey();
    this.farmer = new Farmer();
    this.seed = 20261127;
    this.world = new World(this.seed);
    this.state = 'title'; // title | playing | paused | caught | escaped
    this.distanceM = 0;
    this.score = 0;
    this.corn = 0;
    this.lives = LIVES;
    this.stamina = PLAYER.staminaMax;
    this.stagesCleared = 0;
    this.bestScore = 0;
    this.time = 0;
    this.bannerT = 0;
    this.bannerStage = null;
    this.particles = [];
    this.dustT = 0;
    this.hideStack = null; // the haystack Giblet is hiding in, if any
    this.hideBonusGiven = false;
    this._last = 0;
    this._raf = 0;
    this._started = false;
  }

  get stage() {
    return this.world.stageAt(this.distanceM);
  }

  get farmerGap() {
    return this.farmer.gap;
  }

  get escaped() {
    return this.state === 'escaped';
  }

  reset() {
    this.seed = (this.seed + 7919) % 100000;
    this.world = new World(this.seed);
    this.turkey.reset();
    this.farmer.reset();
    this.distanceM = 0;
    this.score = 0;
    this.corn = 0;
    this.lives = LIVES;
    this.stamina = PLAYER.staminaMax;
    this.stagesCleared = 0;
    this.bannerT = 0;
    this.bannerStage = null;
    this.particles = [];
    this.hideStack = null;
    this.hideBonusGiven = false;
    this.state = 'playing';
  }

  start() {
    if (this._started) return;
    this._started = true;
    this._last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this.frame(dt);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  // One frame: update (unless paused / title / end) then draw.
  frame(dt) {
    this.time += dt;
    const input = this.input;
    if (input.mutePressed) this.sounds.toggleMute();

    if (this.state === 'title') {
      this.sounds.unlock();
      if (input.anyPressed) {
        this.sounds.stopMusic();
        this.sounds.gobble();
        this.state = 'playing';
      } else {
        this.sounds.startMusic();
      }
    } else if (this.state === 'playing') {
      if (input.pausePressed) {
        this.state = 'paused';
      } else {
        this.update(dt);
      }
    } else if (this.state === 'paused') {
      if (input.pausePressed) this.state = 'playing';
    } else {
      // caught / escaped: R or click runs again.
      if (input.restartPressed || input.anyPressed) this.reset();
    }

    this.draw();
    input.endFrame();
  }

  update(dt) {
    const input = this.input;
    const turkey = this.turkey;
    const stage = this.stage;

    // --- speed & stamina ---
    const wantSprint = input.sprint && this.stamina > 1 && !turkey.hiding;
    let speedPx = PLAYER.baseSpeed * stage.speed;
    if (wantSprint) {
      speedPx = PLAYER.sprintSpeed * stage.speed;
      this.stamina -= PLAYER.staminaDrain * dt;
    } else if (input.slow) {
      speedPx = PLAYER.slowSpeed * stage.speed;
      this.stamina += PLAYER.staminaRegen * dt;
    } else {
      this.stamina += PLAYER.staminaRegen * dt;
    }
    if (this.stamina < 0) this.stamina = 0;
    if (this.stamina > PLAYER.staminaMax) this.stamina = PLAYER.staminaMax;
    if (turkey.hiding) speedPx *= 0.4;

    // --- jump / hide ---
    if (input.jumpPressed) {
      if (turkey.hiding) {
        this._leaveHaystack();
      }
      turkey.tryJump(this.sounds);
    }
    this._updateHiding();

    // --- move the world ---
    const prevDistance = this.distanceM;
    this.distanceM += (speedPx * dt) * METRES_PER_PX;
    this.score += speedPx * dt * METRES_PER_PX * SCORE.perMetre;

    // --- stage transitions ---
    const newStage = this.stage;
    if (newStage !== stage) {
      this.stagesCleared += 1;
      this.score += SCORE.stageBonus;
      this.bannerT = 2.6;
      this.bannerStage = newStage;
      this.sounds.stageClear();
    }
    if (this.bannerT > 0) this.bannerT -= dt;

    // --- turkey & farmer ---
    turkey.update(dt, speedPx, input);
    const cleanRunning = !turkey.stumbling && !turkey.hiding;
    this.farmer.update(dt, {
      sprinting: wantSprint,
      stumbling: turkey.stumbling,
      cleanRunning,
      hidden: turkey.hiding,
    });
    this.farmer.maybeShout(this.sounds);

    // --- knives falling ---
    for (const e of this.world.entities) {
      if (e.kind !== 'knifeFall' || e.taken) continue;
      const sx = this.world.screenX(e.m, this.distanceM);
      if (!e.falling && !e.landed && sx < turkey.x + 320 && sx > turkey.x - 60) {
        e.falling = true;
      }
      if (e.falling && !e.landed) {
        e.fallY += 980 * dt;
        if (e.fallY >= 0) {
          e.fallY = 0;
          e.landed = true;
          e.landT = 0;
          this.sounds.land();
          this._checkKnifeLanding(e);
        }
      }
      if (e.landed) {
        e.landT += dt;
        if (e.landT > 1.4) e.taken = true;
      }
    }

    // --- collisions & pickups ---
    this._collide();

    // --- dust & feathers ---
    this.dustT -= dt;
    if (turkey.onGround && !turkey.hiding && this.dustT <= 0) {
      this.dustT = 0.14;
      this._spawnDust(turkey.x - 20, GROUND_Y - 2);
    }
    this._updateParticles(dt);

    // --- end conditions ---
    if (this.distanceM >= RUN_LENGTH_M) {
      this.distanceM = RUN_LENGTH_M;
      this.score += SCORE.escapedBonus;
      this.bestScore = Math.max(this.bestScore, Math.floor(this.score));
      this.state = 'escaped';
      this.sounds.fanfare();
      return;
    }
    if (this.farmer.caught || this.lives <= 0) {
      this.bestScore = Math.max(this.bestScore, Math.floor(this.score));
      this.state = 'caught';
      this.sounds.sadTrombone();
    }
  }

  _updateHiding() {
    const turkey = this.turkey;
    const input = this.input;
    if (turkey.hiding) {
      // Stay glued to the haystack as it scrolls; release Down to pop out.
      if (!input.down || !this.hideStack) {
        this._leaveHaystack();
        return;
      }
      const sx = this.world.screenX(this.hideStack.m, this.distanceM);
      turkey.x = sx;
      if (sx < -80) this._leaveHaystack(); // stack scrolled off: no more cover
      return;
    }
    if (!input.down || !turkey.onGround) return;
    // Find a haystack under the turkey.
    for (const e of this.world.entities) {
      if (e.kind !== 'haystack' || e.taken) continue;
      const box = entityBox(e, this.distanceM);
      if (Math.abs(box.x + box.w / 2 - turkey.x) < 70) {
        turkey.hiding = true;
        turkey.hidden = true;
        this.hideStack = e;
        if (!this.hideBonusGiven) {
          this.score += SCORE.hideBonus;
          this.hideBonusGiven = true;
        }
        this.sounds.gobble();
        return;
      }
    }
  }

  _leaveHaystack() {
    this.turkey.hiding = false;
    this.turkey.hidden = false;
    this.hideStack = null;
    // Do NOT snap back to the run spot: the turkey pops out where the
    // haystack is and runs back to its place. Snapping would teleport him
    // under whatever is passing overhead at that moment. Never pop out
    // off-screen: clamp to just inside the left edge.
    if (this.turkey.x < 60) this.turkey.x = 60;
  }

  _checkKnifeLanding(e) {
    const turkey = this.turkey;
    if (turkey.hiding || turkey.hidden) return;
    const box = { x: this.world.screenX(e.m, this.distanceM) - 14, y: GROUND_Y - 74, w: 28, h: 74 };
    if (overlaps(turkey.box, box)) this._hit(e, 'knife');
  }

  _collide() {
    const turkey = this.turkey;
    if (turkey.hiding || turkey.hidden) return; // safe inside the haystack
    const tbox = turkey.box;
    for (const e of this.world.entities) {
      if (e.taken || e.hit) continue;
      const sx = this.world.screenX(e.m, this.distanceM);
      if (sx < -160 || sx > VIEW_W + 160) continue;
      if (e.kind === 'haystack') {
        e.near = Math.abs(sx - turkey.x) < 170;
        continue;
      }
      if (e.kind === 'knifeFall') {
        // A falling knife only hurts at the landing moment — or while it
        // sticks in the ground afterwards, like any low obstacle.
        if (!e.landed) continue;
        const kbox = {
          x: this.world.screenX(e.m, this.distanceM) - 13,
          y: GROUND_Y - 74,
          w: 26,
          h: 74,
        };
        if (overlaps(tbox, kbox)) this._hit(e, 'knife');
        continue;
      }
      const box = entityBox(e, this.distanceM);
      // Forgiving hitbox for things that hurt: shave 5 px off the sides and
      // 6 px off the top, so a jump that visually clears the oven is not
      // called a hit on a corner pixel. Pickups keep their full box.
      const hurtBox =
        e.kind === 'corn' || e.kind === 'gravy'
          ? box
          : { x: box.x + 5, y: box.y + 6, w: box.w - 10, h: box.h - 6 };
      if (!overlaps(tbox, hurtBox)) {
        if (e.kind === 'corn' || e.kind === 'gravy') continue;
        // Mark jumpable obstacles as passed once behind the turkey.
        if (sx < turkey.x - 80) e.passed = true;
        continue;
      }
      if (e.kind === 'corn') {
        e.taken = true;
        this.corn += 1;
        this.score += SCORE.corn;
        this.farmer.onCorn();
        this.sounds.corn();
        this._spawnSparkle(box.x + box.w / 2, box.y + box.h / 2);
      } else if (e.kind === 'gravy') {
        e.taken = true;
        turkey.shield = true;
        this.sounds.shield();
        this._spawnSparkle(box.x + box.w / 2, box.y + box.h / 2);
      } else {
        this._hit(e, e.kind);
      }
    }
  }

  _hit(e, kind) {
    const turkey = this.turkey;
    if (e.hit) return;
    e.hit = true;
    this.lastHit = { kind, m: Math.round(e.m), distanceM: Math.round(this.distanceM) };
    if (turkey.shield) {
      // The gravy boat eats the hit: no heart, no stumble, no gap loss.
      turkey.shield = false;
      this.sounds.shield();
      this._spawnFeathers(turkey.x, turkey.box.y + 20, '#ffd97a');
      return;
    }
    this.lives -= 1;
    turkey.stumble();
    this.farmer.onStumble();
    this.sounds.hurt();
    if (kind === 'oven') this.sounds.sizzle();
    this._spawnFeathers(turkey.x, turkey.box.y + 20, '#8a5a2e');
    this._spawnFeathers(turkey.x, turkey.box.y + 30, '#d95f2b');
  }

  _spawnDust(x, y) {
    this.particles.push({
      x, y, r: 3 + Math.random() * 3, life: 0.5, maxLife: 0.5,
      vx: -30 - Math.random() * 30, vy: -14 - Math.random() * 18, color: '#d9c4a8',
    });
  }

  _spawnFeathers(x, y, color) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x, y, r: 3 + Math.random() * 4, life: 0.9, maxLife: 0.9,
        vx: -60 + Math.random() * 160, vy: -120 + Math.random() * 90, color,
      });
    }
  }

  _spawnSparkle(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x, y, r: 2 + Math.random() * 3, life: 0.6, maxLife: 0.6,
        vx: -40 + Math.random() * 80, vy: -60 + Math.random() * 40, color: '#ffe9a3',
      });
    }
  }

  _updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw() {
    const ctx = this.ctx;
    const s = {
      score: Math.floor(this.score),
      distanceM: this.distanceM,
      lives: this.lives,
      corn: this.corn,
      stage: this.stage,
      farmerGap: this.farmer.gap,
      stamina: this.stamina,
      bannerT: this.bannerT,
      escaped: this.state === 'escaped',
      stagesCleared: this.stagesCleared,
      bestScore: this.bestScore,
    };
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    R.drawBackground(ctx, this.stage, this.distanceM, this.time);
    for (const d of this.world.visibleDecor(this.distanceM)) {
      R.drawDecor(ctx, d, this.distanceM);
    }
    for (const e of this.world.visible(this.distanceM)) {
      R.drawEntity(ctx, e, this.distanceM, this.time);
    }
    R.drawFarmer(ctx, this.farmer, this.time);
    if (!this.turkey.hidden) R.drawTurkey(ctx, this.turkey, this.time);
    // A hiding turkey is inside the haystack: draw it over him.
    if (this.turkey.hidden && this.hideStack) {
      R.drawEntity(ctx, this.hideStack, this.distanceM, this.time);
    }
    R.drawParticles(ctx, this.particles);
    if (this.state !== 'title') R.drawHUD(ctx, s);
    R.drawStageBanner(ctx, s);
    if (this.state === 'title') R.drawTitle(ctx, s, this.time);
    if (this.state === 'paused') R.drawPaused(ctx);
    if (this.state === 'caught' || this.state === 'escaped') R.drawEnd(ctx, s, this.time);
  }
}

// ---------- boot ----------

function boot() {
  const canvas = document.getElementById('game');
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const selftest = params.get('selftest');
  const game = new Game(canvas);
  if (selftest) {
    runSelfTest(game);
    return;
  }
  if (shot) {
    setupShot(game, shot);
    game.draw();
    return;
  }
  game.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
