// Deterministic screenshot states (?shot=...) and the headless self-test
// (?selftest=1). A shot sets the game to a fixed, rich frame — title, a
// farmyard run in full flight, the kitchen at its hottest, the escaped end
// screen — and draws it once, so a screenshot is a real render of the
// game's own code. The self-test runs the real loop with scripted inputs
// and reports the result into #selftest-out for headless verification.

import { GROUND_Y, RUN_LENGTH_M, PLAYER } from './config.js';
import { World } from './world.js';

function basePlaying(game, distanceM, opts) {
  game.state = 'playing';
  game.distanceM = distanceM;
  game.score = opts.score || 0;
  game.corn = opts.corn || 0;
  game.lives = opts.lives ?? 3;
  game.stamina = opts.stamina ?? 80;
  game.farmer.gap = opts.gap ?? 60;
  game.time = opts.time ?? 1.7;
  game.turkey.y = opts.jumpY ?? 0;
  game.turkey.vy = 0;
  game.turkey.onGround = (opts.jumpY ?? 0) === 0;
  game.turkey.runPhase = 2.4;
  game.turkey.shield = !!opts.shield;
}

export function setupShot(game, shot) {
  // Fixed seeds per shot so the frames are reproducible.
  if (shot === 'start') {
    game.state = 'title';
    game.distanceM = 40;
    game.time = 1.7;
    game.world = new World(20261127);
    game.turkey.runPhase = 1.2;
    return;
  }
  if (shot === 'play') {
    game.world = new World(20261127);
    // 118 m in the farmyard: fence ahead, corn in reach, haystack behind,
    // the farmer already closing in — the whole game in one frame.
    basePlaying(game, 118, { score: 1240, corn: 3, gap: 62, jumpY: 130, time: 1.7 });
    return;
  }
  if (shot === 'kitchen') {
    game.world = new World(20261127);
    // 742 m, deep in the kitchen: an oven glowing, a knife in the air,
    // Bram nearly on Giblet's tail.
    basePlaying(game, 742, { score: 7310, corn: 11, gap: 24, jumpY: 0, time: 2.3, shield: true });
    return;
  }
  if (shot === 'end') {
    game.world = new World(20261127);
    game.state = 'escaped';
    game.distanceM = RUN_LENGTH_M;
    game.score = 9840;
    game.corn = 14;
    game.lives = 2;
    game.stagesCleared = 3;
    game.bestScore = 9840;
    game.time = 1.7;
    game.turkey.y = 0;
    game.turkey.onGround = true;
    return;
  }
  // Unknown shot: fall back to the title.
  game.state = 'title';
  game.time = 1.7;
}

// Run the real update loop headlessly with a reactive bot and report.
// The bot jumps when a jumpable obstacle is close ahead and ducks under
// flying knives — a fair player. If it can finish 900 m, a human can too.
export function runSelfTest(game) {
  game.state = 'playing';
  const out = document.getElementById('selftest-out');
  const report = { frames: 0, jumps: 0, ducks: 0, hits: 0, corn: 0, state: 'playing', hitLog: [], trace: [] };
  const ring = []; // rolling last-30-frames trace, kept for the hit before it
  const dt = 1 / 60;
  let prevLives = game.lives;
  let prevCorn = 0;
  const jumpable = (e) =>
    ['fence', 'bale', 'oven'].includes(e.kind) || (e.kind === 'knifeFall' && e.landed);
  for (let f = 0; f < 9000; f++) {
    // Look ahead from the turkey and react.
    let wantJump = false;
    let wantDuck = false;
    let knifeNear = false; // a flying knife anywhere near: never jump into it
    let knifeAhead400 = false; // any knife within 400 px: do not sprint at it
    for (const e of game.world.entities) {
      if (e.taken || e.hit || e.passed) continue;
      const sx = game.world.screenX(e.m, game.distanceM);
      const ahead = sx - game.turkey.x;
      if (ahead < -100 || ahead > 450) continue;
      if ((e.kind === 'knifeFly' || e.kind === 'knifeFall') && ahead < 400 && ahead > -90) {
        knifeAhead400 = true;
      }
      if (ahead > 300) continue;
      if (e.kind === 'knifeFly' && ahead < 260 && ahead > -90) knifeNear = true;
      // Jump once per obstacle from the ground; spend the double jump only
      // while falling toward an obstacle (an immediate double jump overshoots
      // onto the next obstacle). Ovens are tallest: jump them earliest.
      const jumpRange = e.kind === 'oven' ? 175 : 150;
      if (jumpable(e) && ahead < jumpRange) {
        if (game.turkey.onGround) wantJump = true;
        else if (game.turkey.jumpsUsed < 2 && game.turkey.vy < -100 && game.turkey.y < 120 && ahead < 130) wantJump = true;
      }
      // Keep ducking until the blade is fully past: its tail sticks out
      // 46 px behind its centre, the turkey 37 px in front of his.
      if (e.kind === 'knifeFly' && ahead < 200 && ahead > -90) wantDuck = true;
      if (e.kind === 'knifeFall' && !e.landed && ahead < 160) {
        if (game.turkey.onGround) wantJump = true; // hop over the spot where it is about to land
        else if (game.turkey.jumpsUsed < 2 && game.turkey.vy < -100 && game.turkey.y < 120) wantJump = true;
      }
    }
    if (wantJump && !wantDuck && !knifeNear) {
      game.input.jumpPressed = true;
      report.jumps += 1;
    }
    game.input.down = wantDuck;
    if (wantDuck) report.ducks += 1;
    // A careful player never sprints at a knife: the long jump carries the
    // turkey right into the blade's path.
    game.input.sprint = f % 300 < 120 && !knifeAhead400;
    game.frame(dt);
    ring.push({
      f,
      d: Math.round(game.distanceM * 10) / 10,
      y: Math.round(game.turkey.y),
      vy: Math.round(game.turkey.vy),
      g: game.turkey.onGround,
      j: game.turkey.jumpsUsed,
      down: game.input.down,
      duck: game.turkey.ducking,
      spr: game.input.sprint,
      st: Math.round(game.stamina),
    });
    if (ring.length > 30) ring.shift();
    // Probe: what was the turkey doing when a knife was right on top of it?
    for (const e of game.world.entities) {
      if (e.kind !== 'knifeFly' || e.taken || e.hit) continue;
      const ahead = game.world.screenX(e.m, game.distanceM) - game.turkey.x;
      if (Math.abs(ahead) < 60) {
        report.probe = {
          frame: f,
          ahead: Math.round(ahead),
          down: game.input.down,
          ducking: game.turkey.ducking,
          y: Math.round(game.turkey.y),
          onGround: game.turkey.onGround,
          boxY: Math.round(game.turkey.box.y),
        };
      }
    }
    if (game.lives < prevLives) {
      report.hits += prevLives - game.lives;
      prevLives = game.lives;
      if (game.lastHit) {
        report.hitLog.push({ ...game.lastHit, frame: f });
        report.trace.push(...ring);
      }
    }
    if (game.corn > prevCorn) prevCorn = game.corn;
    report.frames = f + 1;
    if (game.state === 'caught' || game.state === 'escaped') break;
  }
  report.state = game.state;
  report.distanceM = Math.round(game.distanceM);
  report.score = Math.floor(game.score);
  report.corn = game.corn;
  report.lives = game.lives;
  report.farmerGap = Math.round(game.farmer.gap);
  report.counts = game.world.counts();
  report.entities = game.world.entities.length;
  if (out) out.textContent = JSON.stringify(report);
  document.title = `SELFTEST ${JSON.stringify(report)}`;
}
