// The world: 900 metres of farm, barn and kitchen, generated once per run
// from a seed so every run deals the same counted content — 3 stages,
// 9 ovens, 24 carving knives, 12 haystacks, 18 corn cobs, 3 gravy boats —
// and so the screenshots are reproducible. Entities live in metres along
// the run; the renderer turns metres into screen x. Collisions are AABBs
// against the turkey's box.

import { STAGES, RUN_LENGTH_M, METRES_PER_PX, GROUND_Y, PLAYER } from './config.js';
import { mulberry32, pick, intBetween } from './random.js';

const STAGE_CLEAR_M = 12; // keep stage boundaries clear for the banner

export class World {
  constructor(seed) {
    this.seed = seed;
    this.entities = [];
    this.decor = [];
    this.generate();
  }

  generate() {
    const rng = mulberry32(this.seed);
    this.entities = [];
    this.decor = [];
    const placed = []; // {m, hazard} — every placed metre, for spacing

    // Spacing rules, so the run is always readable: hazards (ovens, falling
    // and flying knives, fences, bales) stand at least 10 m apart — a duck
    // under a knife never costs the jump that follows — and everything else
    // at least 6 m from anything. Hazards go in first.
    const HAZARD_GAP = 10;
    const ANY_GAP = 6;
    const free = (m, hazard) => {
      if (m < 15 || m > RUN_LENGTH_M - 15) return false;
      for (const s of STAGES) {
        if (m < RUN_LENGTH_M - 5 && Math.abs(m - s.toM) < STAGE_CLEAR_M) return false;
      }
      for (const p of placed) {
        const need = hazard && p.hazard ? HAZARD_GAP : ANY_GAP;
        if (Math.abs(p.m - m) < need) return false;
      }
      return true;
    };
    const spot = (stage, hazard) => {
      for (let tries = 0; tries < 300; tries++) {
        const m = stage.fromM + 20 + rng() * (stage.toM - stage.fromM - 40);
        if (free(m, hazard)) return m;
      }
      return null;
    };
    const add = (m, hazard, entity) => {
      placed.push({ m, hazard });
      this.entities.push(entity);
    };

    for (const stage of STAGES) {
      // Hazards first: 3 ovens, 4 falling knives, 4 flying knives per stage.
      for (let i = 0; i < stage.ovens; i++) {
        const m = spot(stage, true);
        if (m == null) continue;
        add(m, true, this._makeObstacle('oven', m, rng, stage.id));
      }
      for (let i = 0; i < stage.knives / 2; i++) {
        const m = spot(stage, true);
        if (m == null) continue;
        add(m, true, this._makeObstacle('knifeFall', m, rng, stage.id));
      }
      for (let i = 0; i < stage.knives / 2; i++) {
        const m = spot(stage, true);
        if (m == null) continue;
        add(m, true, this._makeObstacle('knifeFly', m, rng, stage.id));
      }
      // Walking obstacles: fences and hay bales, roughly every N metres.
      for (let m = stage.fromM + 18; m < stage.toM - 14; m += stage.obstacleEveryM) {
        const mm = m + intBetween(rng, -5, 5);
        if (!free(mm, true)) continue;
        add(mm, true, this._makeObstacle(pick(rng, ['fence', 'fence', 'bale', 'bale', 'fence']), mm, rng));
      }
      // Then the rest: 4 haystacks, 6 corn, 1 gravy boat per stage.
      for (let i = 0; i < stage.haystacks; i++) {
        const m = spot(stage, false);
        if (m == null) continue;
        add(m, false, { kind: 'haystack', m, w: 110, h: 96, taken: false });
      }
      for (let i = 0; i < stage.corn; i++) {
        const m = spot(stage, false);
        if (m == null) continue;
        const high = rng() < 0.4; // some corn is earned with a jump
        add(m, false, {
          kind: 'corn',
          m,
          w: 34,
          h: 34,
          yOff: high ? 120 : 46,
          taken: false,
          bob: rng() * Math.PI * 2,
        });
      }
      for (let i = 0; i < stage.gravy; i++) {
        const m = spot(stage, false);
        if (m == null) continue;
        add(m, false, {
          kind: 'gravy',
          m,
          w: 44,
          h: 36,
          yOff: 46,
          taken: false,
          bob: rng() * Math.PI * 2,
        });
      }
      // Decorations: trees, fences, pumpkins, windows — never collidable.
      for (let m = stage.fromM + 5; m < stage.toM; m += intBetween(rng, 22, 40)) {
        this.decor.push({
          m,
          kind: pick(rng, ['tree', 'tree', 'pumpkin', 'fencePost', 'bush', 'lantern']),
          s: 0.8 + rng() * 0.5,
          stage: stage.id,
        });
      }
    }
    this.entities.sort((a, b) => a.m - b.m);
    this.decor.sort((a, b) => a.m - b.m);
  }

  _makeObstacle(kind, m, rng, stageId) {
    const base = { kind, m, hit: false, passed: false };
    if (kind === 'fence') return { ...base, w: 64, h: 74, yOff: 0 };
    if (kind === 'bale') return { ...base, w: 84, h: 62, yOff: 0 };
    if (kind === 'oven') {
      return { ...base, w: 100, h: stageId === 'kitchen' ? 132 : 118, yOff: 0, hot: stageId === 'kitchen' };
    }
    if (kind === 'knifeFall') {
      return { ...base, w: 26, h: 74, yOff: 0, fallY: -420, falling: false, landed: false, landT: 0 };
    }
    // knifeFly: a blade at head height — duck under it, or jump clean over
    // it. Its box sits at y 547..565: it clips a standing turkey (top 554)
    // but clears a ducking one (top 579).
    return { ...base, w: 92, h: 18, yOff: 55, speed: 260 + rng() * 120 };
  }

  // Screen x of a metre position, given the run's current distance.
  screenX(m, distanceM) {
    return PLAYER.x + (m - distanceM) / METRES_PER_PX;
  }

  // Entities near the screen right now (a little margin either side).
  visible(distanceM) {
    const lo = distanceM - 25;
    const hi = distanceM + (1280 / 1) * METRES_PER_PX + 25;
    return this.entities.filter((e) => e.m > lo && e.m < hi && !e.taken);
  }

  visibleDecor(distanceM) {
    const lo = distanceM - 30;
    const hi = distanceM + 60;
    return this.decor.filter((d) => d.m > lo && d.m < hi);
  }

  // The stage the run is in at this distance.
  stageAt(distanceM) {
    for (const s of STAGES) {
      if (distanceM >= s.fromM && distanceM < s.toM) return s;
    }
    return STAGES[STAGES.length - 1];
  }

  // Counts, for the title screen and the HUD — the promise, kept.
  counts() {
    const c = { ovens: 0, knives: 0, haystacks: 0, corn: 0, gravy: 0, fences: 0, bales: 0 };
    for (const e of this.entities) {
      if (e.kind === 'oven') c.ovens += 1;
      if (e.kind === 'knifeFall' || e.kind === 'knifeFly') c.knives += 1;
      if (e.kind === 'haystack') c.haystacks += 1;
      if (e.kind === 'corn') c.corn += 1;
      if (e.kind === 'gravy') c.gravy += 1;
      if (e.kind === 'fence') c.fences += 1;
      if (e.kind === 'bale') c.bales += 1;
    }
    return c;
  }
}

// AABB overlap test.
export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Screen-space box of an entity at the current distance.
export function entityBox(e, distanceM) {
  const cx = PLAYER.x + (e.m - distanceM) / METRES_PER_PX;
  const w = e.w;
  const h = e.h;
  const yOff = e.yOff || 0;
  return { x: cx - w / 2, y: GROUND_Y - yOff - h, w, h };
}
