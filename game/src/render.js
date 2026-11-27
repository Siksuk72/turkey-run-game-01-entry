// All drawing: the storybook-autumn look. Every sprite is drawn in code —
// no images, no assets — in one warm palette per stage: dawn gold in the
// farmyard, dusk purple in the barn, lamplit night in the kitchen. The
// renderer only draws; the game loop owns the state.

import { VIEW_W, VIEW_H, GROUND_Y, RUN_LENGTH_M, STAGES } from './config.js';
import { entityBox } from './world.js';

// ---------- small helpers ----------

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function text(ctx, s, x, y, font, fill, align) {
  ctx.font = font;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fill;
  ctx.fillText(s, x, y);
}

// ---------- background ----------

export function drawBackground(ctx, stage, distanceM, time) {
  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, stage.skyTop);
  sky.addColorStop(0.55, stage.skyMid);
  sky.addColorStop(1, stage.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, GROUND_Y + 4);

  // Sun in the farmyard, moon in the kitchen.
  if (stage.id === 'farmyard') {
    ctx.save();
    ctx.globalAlpha = 0.95;
    ellipse(ctx, 1080, 110, 52, 52, '#ffe9a3');
    ellipse(ctx, 1080, 110, 66, 66, 'rgba(255,233,163,0.25)');
    ctx.restore();
  } else if (stage.id === 'kitchen') {
    ellipse(ctx, 1080, 110, 40, 40, '#f5f0dc');
    ellipse(ctx, 1066, 100, 10, 10, '#d8d2b8');
    ellipse(ctx, 1092, 122, 7, 7, '#d8d2b8');
  }

  // Drifting clouds / chimney smoke wisps.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#fff4e0';
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 397 + 120 - distanceM * 0.12) % 1500 + 1500) % 1500 - 110;
    const cy = 70 + i * 42;
    ellipse(ctx, cx, cy, 62, 16, '#fff4e0');
    ellipse(ctx, cx + 40, cy + 6, 44, 13, '#fff4e0');
  }
  ctx.restore();

  // Parallax hills: two ridges scrolling at different rates.
  drawHills(ctx, stage, distanceM, 0.18, stage.hillFar, 470, 60);
  drawHills(ctx, stage, distanceM, 0.4, stage.hillNear, 520, 80);

  // The farmhouse silhouette far behind the kitchen stage.
  if (stage.id !== 'farmyard') {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = stage.id === 'barn' ? '#2e1a2e' : '#160f16';
    const hx = 980 - ((distanceM * 0.4) % 1400);
    ctx.fillRect(hx, 470, 170, 150);
    ctx.beginPath();
    ctx.moveTo(hx - 12, 472);
    ctx.lineTo(hx + 85, 408);
    ctx.lineTo(hx + 182, 472);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd97a';
    ctx.fillRect(hx + 30, 520, 26, 34);
    ctx.fillRect(hx + 110, 520, 26, 34);
    ctx.restore();
  }

  // Ground: earth strip with a grass lip and scattered leaves.
  ctx.fillStyle = stage.ground;
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
  ctx.fillStyle = stage.grass;
  ctx.fillRect(0, GROUND_Y, VIEW_W, 14);
  // Dirt texture: deterministic speckles scrolling with the world.
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 60; i++) {
    const mx = ((i * 173 + 40) % 1400);
    const sx = ((mx - distanceM * 22) % 1400 + 1400) % 1400 - 60;
    const sy = GROUND_Y + 26 + ((i * 37) % 74);
    ctx.fillStyle = i % 3 === 0 ? '#5d3a1a' : '#8a5a2e';
    ctx.fillRect(sx, sy, 5, 3);
  }
  ctx.restore();
  // Leaves drifting across the ground.
  drawLeaves(ctx, distanceM, time);
}

function drawHills(ctx, stage, distanceM, rate, color, baseY, amp) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  const off = (distanceM * rate * 22) % 640;
  for (let x = -640; x <= VIEW_W + 640; x += 80) {
    const sx = x - off;
    const y = baseY + Math.sin((x + off) * 0.006) * amp * 0.5 + Math.cos((x + off) * 0.0021) * amp * 0.4;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(VIEW_W, GROUND_Y);
  ctx.closePath();
  ctx.fill();
}

function drawLeaves(ctx, distanceM, time) {
  const cols = ['#d95f2b', '#e9a13b', '#b8452a', '#c98f2e'];
  for (let i = 0; i < 14; i++) {
    const speed = 30 + (i % 4) * 12;
    const x = (((i * 211 + 60 - distanceM * 22 - time * speed) % 1400) + 1400) % 1400 - 60;
    const y = 60 + ((i * 97) % 520) + Math.sin(time * 1.6 + i * 1.7) * 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 2 + i) * 0.8);
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------- decorations ----------

export function drawDecor(ctx, d, distanceM) {
  const x = 300 + (d.m - distanceM) / 0.045;
  if (x < -120 || x > VIEW_W + 120) return;
  ctx.save();
  ctx.translate(x, GROUND_Y);
  ctx.scale(d.s, d.s);
  if (d.kind === 'tree') {
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(-7, -90, 14, 90);
    ellipse(ctx, 0, -110, 46, 58, '#a8542a');
    ellipse(ctx, -28, -86, 30, 36, '#c96a2e');
    ellipse(ctx, 30, -88, 28, 34, '#8a3d1e');
  } else if (d.kind === 'pumpkin') {
    ellipse(ctx, 0, -16, 26, 18, '#e07b2a');
    ctx.strokeStyle = '#b85c1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.quadraticCurveTo(4, -44, 10, -42);
    ctx.stroke();
  } else if (d.kind === 'fencePost') {
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(-4, -52, 8, 52);
    ctx.fillRect(-26, -46, 52, 6);
    ctx.fillRect(-26, -28, 52, 6);
  } else if (d.kind === 'bush') {
    ellipse(ctx, 0, -14, 34, 16, '#7d5a22');
    ellipse(ctx, -20, -10, 20, 11, '#8a6528');
  } else if (d.kind === 'lantern') {
    ctx.fillStyle = '#3a2415';
    ctx.fillRect(-2, -96, 4, 96);
    ctx.fillStyle = '#2c1c10';
    rr(ctx, -14, -116, 28, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#ffd97a';
    rr(ctx, -9, -112, 18, 14, 3);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- the turkey ----------

export function drawTurkey(ctx, turkey, time) {
  const box = turkey.box;
  const cx = box.x + box.w / 2;
  const feet = box.y + box.h;
  ctx.save();
  // Stumble wobble.
  if (turkey.stumbling) {
    ctx.translate(cx, feet);
    ctx.rotate(Math.sin(time * 30) * 0.12);
    ctx.translate(-cx, -feet);
  }
  const legSwing = turkey.onGround && !turkey.ducking
    ? Math.sin(turkey.runPhase * 6) * 10
    : 0;
  const duckK = turkey.ducking ? 0.62 : 1;

  // Legs.
  ctx.strokeStyle = '#e07b2a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 8, feet - 12);
  ctx.lineTo(cx - 8 + legSwing, feet);
  ctx.moveTo(cx + 10, feet - 12);
  ctx.lineTo(cx + 10 - legSwing, feet);
  ctx.stroke();

  // Tail fan: five feathers fanning behind (to the left — he runs right).
  const fanCols = ['#b8452a', '#d95f2b', '#e9a13b', '#8a3d1e', '#c96a2e'];
  for (let i = 0; i < 5; i++) {
    const ang = -0.9 + i * 0.45;
    ctx.save();
    ctx.translate(cx - 18, feet - 34 * duckK);
    ctx.rotate(ang - 0.6);
    ctx.fillStyle = fanCols[i];
    ctx.beginPath();
    ctx.ellipse(-16, 0, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,233,163,0.5)';
    ctx.beginPath();
    ctx.ellipse(-30, 0, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Body.
  ctx.save();
  ctx.translate(cx, feet - 30 * duckK);
  ctx.scale(1, duckK);
  ellipse(ctx, 0, 0, 30, 26, '#8a5a2e');
  ellipse(ctx, 2, 4, 26, 20, '#a8763e');
  // Wing.
  ctx.save();
  ctx.rotate(-0.25 + (turkey.onGround ? Math.sin(turkey.runPhase * 6) * 0.12 : -0.4));
  ellipse(ctx, -6, 2, 18, 11, '#6b4226');
  ctx.restore();
  ctx.restore();

  // Head + neck (front, right side).
  const hx = cx + 24;
  const hy = feet - 56 * duckK;
  ctx.strokeStyle = '#a8763e';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(cx + 14, feet - 40 * duckK);
  ctx.quadraticCurveTo(cx + 26, feet - 52 * duckK, hx, hy + 6);
  ctx.stroke();
  ellipse(ctx, hx, hy, 13, 12, '#c98f5a');
  // Beak.
  ctx.fillStyle = '#e07b2a';
  ctx.beginPath();
  ctx.moveTo(hx + 8, hy - 2);
  ctx.lineTo(hx + 24, hy + 3);
  ctx.lineTo(hx + 8, hy + 7);
  ctx.closePath();
  ctx.fill();
  // Wattle.
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.ellipse(hx + 6, hy + 12, 4, 7, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Eye.
  ellipse(ctx, hx + 4, hy - 4, 3, 3, '#1d1b2e');
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(hx + 5, hy - 5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Gravy-boat shield: a golden ring around the turkey.
  if (turkey.shield) {
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(time * 5) * 0.15;
    ctx.strokeStyle = '#ffd97a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, feet - 32, 52, 40, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ---------- the farmer ----------

export function drawFarmer(ctx, farmer, time) {
  const x = farmer.screenX;
  const feet = GROUND_Y;
  const bob = Math.abs(Math.sin(time * 9)) * 6;
  const legSwing = Math.sin(time * 9) * 12;
  ctx.save();
  ctx.translate(x, feet - bob);
  // Legs: blue overalls.
  ctx.strokeStyle = '#2e4a6b';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-6, -34);
  ctx.lineTo(-6 + legSwing, 0);
  ctx.moveTo(8, -34);
  ctx.lineTo(8 - legSwing, 0);
  ctx.stroke();
  // Body: red shirt + overalls.
  rr(ctx, -20, -78, 42, 48, 10);
  ctx.fillStyle = '#b8452a';
  ctx.fill();
  ctx.fillStyle = '#2e4a6b';
  ctx.fillRect(-20, -52, 42, 24);
  // Arms pumping.
  ctx.strokeStyle = '#b8452a';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-16, -66);
  ctx.lineTo(-30, -48 + legSwing * 0.6);
  ctx.moveTo(18, -66);
  ctx.lineTo(32, -50 - legSwing * 0.6);
  ctx.stroke();
  // Head + beard.
  ellipse(ctx, 2, -92, 14, 14, '#e8b98a');
  ellipse(ctx, 2, -82, 12, 8, '#e8e0d0'); // beard
  // Angry eyes.
  ctx.fillStyle = '#1d1b2e';
  ctx.beginPath();
  ctx.arc(6, -96, 2, 0, Math.PI * 2);
  ctx.arc(12, -96, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d1b2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(3, -101);
  ctx.lineTo(9, -99);
  ctx.moveTo(15, -99);
  ctx.lineTo(9, -101);
  ctx.stroke();
  // Straw hat.
  ctx.fillStyle = '#e9c46a';
  ctx.beginPath();
  ctx.ellipse(2, -102, 24, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2, -106, 13, 8, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#b8452a';
  ctx.fillRect(-11, -108, 26, 4);
  // Lantern swinging from his hand (dusk + night stages).
  const lx = -34;
  const ly = -44 + Math.sin(time * 9) * 3;
  ctx.strokeStyle = '#3a2415';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-28, -50);
  ctx.lineTo(lx, ly);
  ctx.stroke();
  ctx.fillStyle = '#2c1c10';
  rr(ctx, lx - 7, ly, 14, 18, 3);
  ctx.fill();
  ctx.fillStyle = '#ffd97a';
  rr(ctx, lx - 4, ly + 3, 8, 11, 2);
  ctx.fill();
  ctx.restore();

  // Shout bubble when he is close.
  if (farmer.closeness > 0.72) {
    const shout = farmer.closeness > 0.9 ? 'GOTCHA!' : 'COME BACK!';
    ctx.save();
    ctx.fillStyle = '#fff4e0';
    rr(ctx, x - 10, feet - 168, 132, 34, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 8, feet - 134);
    ctx.lineTo(x + 2, feet - 120);
    ctx.lineTo(x + 20, feet - 134);
    ctx.closePath();
    ctx.fill();
    text(ctx, shout, x + 56, feet - 150, 'bold 17px Georgia', '#7a2a12', 'center');
    ctx.restore();
  }
}

// ---------- obstacles & pickups ----------

export function drawEntity(ctx, e, distanceM, time) {
  const box = entityBox(e, distanceM);
  if (box.x + box.w < -140 || box.x > VIEW_W + 140) return;
  const cx = box.x + box.w / 2;
  if (e.kind === 'fence') {
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(box.x + 4, box.y + 8, 8, box.h - 8);
    ctx.fillRect(box.x + box.w - 12, box.y + 8, 8, box.h - 8);
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(box.x, box.y + 14, box.w, 9);
    ctx.fillRect(box.x, box.y + 40, box.w, 9);
  } else if (e.kind === 'bale') {
    ctx.fillStyle = '#d9a441';
    rr(ctx, box.x, box.y + 8, box.w, box.h - 8, 18);
    ctx.fill();
    ctx.strokeStyle = '#a8763e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, box.y + box.h / 2 + 4, 26, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, box.y + box.h / 2 + 4, 14, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (e.kind === 'oven') {
    const flick = 0.7 + Math.sin(time * 11 + e.m) * 0.3;
    // Heat glow.
    ctx.save();
    ctx.globalAlpha = 0.35 * flick;
    ctx.fillStyle = '#ff7b2a';
    ellipse(ctx, cx, box.y + box.h - 10, box.w * 0.75, 26, '#ff7b2a');
    ctx.restore();
    // Body.
    ctx.fillStyle = '#241a20';
    rr(ctx, box.x, box.y, box.w, box.h, 10);
    ctx.fill();
    ctx.fillStyle = '#3a2a30';
    ctx.fillRect(box.x + 6, box.y + 6, box.w - 12, 14);
    // Door with fire inside.
    ctx.fillStyle = '#120d10';
    rr(ctx, box.x + 16, box.y + 30, box.w - 32, box.h - 46, 6);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = flick;
    const fire = ctx.createLinearGradient(0, box.y + 34, 0, box.y + box.h - 20);
    fire.addColorStop(0, '#ffcf5a');
    fire.addColorStop(0.5, '#ff7b2a');
    fire.addColorStop(1, '#c0392b');
    ctx.fillStyle = fire;
    rr(ctx, box.x + 22, box.y + 36, box.w - 44, box.h - 58, 5);
    ctx.fill();
    ctx.restore();
    // Chimney + smoke.
    ctx.fillStyle = '#1a1216';
    ctx.fillRect(box.x + box.w - 34, box.y - 26, 18, 28);
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#cfc4b8';
    for (let i = 0; i < 3; i++) {
      const sy = box.y - 34 - ((time * 22 + i * 26) % 60);
      ellipse(ctx, box.x + box.w - 25 + Math.sin(time * 2 + i) * 6, sy, 7, 5, '#cfc4b8');
    }
    ctx.restore();
    // Danger stripe.
    ctx.fillStyle = '#e9c46a';
    ctx.font = 'bold 13px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('HOT!', cx, box.y + 18);
  } else if (e.kind === 'knifeFall') {
    // Shadow warning on the ground while it falls.
    const fy = e.fallY; // px above ground, negative while falling
    const groundY = GROUND_Y;
    if (!e.landed) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ellipse(ctx, cx, groundY + 6, 22, 6, '#1d1b2e');
      ctx.restore();
      drawKnife(ctx, cx, groundY + fy, 1, time);
    } else {
      drawKnife(ctx, cx, groundY - 8, 1, time, true);
    }
  } else if (e.kind === 'knifeFly') {
    // Motion lines.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const ly = box.y + 4 + i * 6;
      ctx.beginPath();
      ctx.moveTo(box.x + box.w + 6 + i * 8, ly);
      ctx.lineTo(box.x + box.w + 34 + i * 8, ly);
      ctx.stroke();
    }
    ctx.restore();
    drawKnife(ctx, cx, box.y + box.h / 2, 0, time);
  } else if (e.kind === 'haystack') {
    ctx.fillStyle = '#d9a441';
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + box.h);
    ctx.quadraticCurveTo(cx, box.y - 14, box.x + box.w, box.y + box.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a8763e';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 16, box.y + box.h - 6);
      ctx.quadraticCurveTo(cx + i * 16 + 6, box.y + 22, cx + i * 16, box.y + 52);
      ctx.stroke();
    }
    // "HIDE" hint when the turkey is near.
    if (e.near) {
      text(ctx, 'HOLD ↓ TO HIDE', cx, box.y - 18, 'bold 15px Georgia', '#fff4e0', 'center');
    }
  } else if (e.kind === 'corn') {
    const bobY = Math.sin(time * 3 + e.bob) * 5;
    ctx.save();
    ctx.translate(cx, box.y + box.h / 2 + bobY);
    ctx.rotate(0.5);
    ellipse(ctx, 0, 0, 9, 17, '#f2c14e');
    ctx.fillStyle = '#d9a441';
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        ctx.beginPath();
        ctx.arc(r * 5, c * 9, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#5d8a3a';
    ctx.beginPath();
    ctx.moveTo(-8, 12);
    ctx.lineTo(-16, 24);
    ctx.lineTo(-2, 18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 12);
    ctx.lineTo(16, 24);
    ctx.lineTo(2, 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (e.kind === 'gravy') {
    const bobY = Math.sin(time * 3 + e.bob) * 5;
    ctx.save();
    ctx.translate(cx, box.y + box.h / 2 + bobY);
    // Gravy boat: white ceramic boat, brown gravy, golden glow.
    ctx.globalAlpha = 0.3 + Math.sin(time * 4) * 0.1;
    ctx.strokeStyle = '#ffd97a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f5f0dc';
    ctx.beginPath();
    ctx.moveTo(-20, -4);
    ctx.quadraticCurveTo(0, 18, 20, -4);
    ctx.quadraticCurveTo(0, 4, -20, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8a5a2e';
    ctx.beginPath();
    ctx.ellipse(0, -2, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawKnife(ctx, cx, y, vertical, time, stuck) {
  ctx.save();
  ctx.translate(cx, y);
  if (vertical) {
    // Blade pointing down, handle up.
    ctx.fillStyle = '#c8ccd4';
    ctx.beginPath();
    ctx.moveTo(-6, -30);
    ctx.lineTo(6, -30);
    ctx.lineTo(0, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-4, -28, 2, 34);
    ctx.fillStyle = '#5d3a1a';
    rr(ctx, -7, -46, 14, 18, 4);
    ctx.fill();
  } else {
    // Blade pointing left (flying at the turkey), handle right.
    ctx.fillStyle = '#c8ccd4';
    ctx.beginPath();
    ctx.moveTo(-34, -5);
    ctx.lineTo(10, -5);
    ctx.lineTo(22, 0);
    ctx.lineTo(10, 5);
    ctx.lineTo(-34, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-30, -3, 36, 2);
    ctx.fillStyle = '#5d3a1a';
    rr(ctx, 22, -7, 16, 14, 4);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- particles ----------

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------- HUD ----------

export function drawHUD(ctx, s) {
  // Top bar.
  ctx.save();
  ctx.fillStyle = 'rgba(29,27,46,0.72)';
  rr(ctx, 16, 14, 470, 64, 12);
  ctx.fill();
  text(ctx, `SCORE  ${s.score}`, 34, 34, 'bold 22px Georgia', '#ffe9a3');
  text(ctx, `DISTANCE  ${Math.floor(s.distanceM)} m / ${RUN_LENGTH_M} m`, 34, 60, 'bold 15px Georgia', '#fff4e0');
  // Stage, top centre.
  ctx.fillStyle = 'rgba(29,27,46,0.72)';
  rr(ctx, 500, 14, 280, 64, 12);
  ctx.fill();
  text(ctx, s.stage.name, 640, 34, 'bold 19px Georgia', '#ffe9a3', 'center');
  text(ctx, s.stage.sub, 640, 58, '13px Georgia', '#fff4e0', 'center');
  // Hearts + corn, top right.
  ctx.fillStyle = 'rgba(29,27,46,0.72)';
  rr(ctx, 1050, 14, 214, 64, 12);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const hx = 1082 + i * 34;
    drawHeart(ctx, hx, 46, i < s.lives ? '#e8452a' : 'rgba(255,255,255,0.25)');
  }
  text(ctx, `🌽 ${s.corn}`, 1196, 46, 'bold 20px Georgia', '#ffe9a3', 'center');

  // Farmer-gap bar, bottom centre: Bram on the left, Giblet on the right.
  const bx = 390;
  const bw = 500;
  const by = VIEW_H - 44;
  ctx.fillStyle = 'rgba(29,27,46,0.72)';
  rr(ctx, bx - 130, by - 14, bw + 260, 34, 10);
  ctx.fill();
  text(ctx, 'FARMER BRAM', bx - 118, by + 3, 'bold 14px Georgia', '#ffb08a');
  // Track.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(ctx, bx, by - 6, bw, 12, 6);
  ctx.fill();
  const frac = s.farmerGap / 120;
  const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  grad.addColorStop(0, '#e8452a');
  grad.addColorStop(0.5, '#e9a13b');
  grad.addColorStop(1, '#5da85d');
  ctx.fillStyle = grad;
  rr(ctx, bx, by - 6, Math.max(10, bw * frac), 12, 6);
  ctx.fill();
  // Markers: Bram's hat at the left end, Giblet at the right.
  text(ctx, '🧑‍🌾', bx - 8, by + 2, '20px serif', '#fff', 'center');
  text(ctx, '🦃', bx + bw + 10, by + 2, '20px serif', '#fff', 'center');
  text(ctx, `${Math.floor(s.farmerGap)} m`, bx + bw / 2, by - 22, 'bold 13px Georgia', '#fff4e0', 'center');

  // Stamina bar, under the gap bar.
  const sw = 220;
  const sx = VIEW_W / 2 - sw / 2;
  const sy = VIEW_H - 16;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(ctx, sx, sy, sw, 7, 3);
  ctx.fill();
  ctx.fillStyle = s.stamina > 25 ? '#7ec8e3' : '#e8452a';
  rr(ctx, sx, sy, Math.max(4, sw * (s.stamina / 100)), 7, 3);
  ctx.fill();
  text(ctx, 'SPRINT (SHIFT)', sx + sw + 10, sy + 4, '11px Georgia', '#fff4e0');
  ctx.restore();
}

function drawHeart(ctx, x, y, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-12, -4, -6, -12, 0, -5);
  ctx.bezierCurveTo(6, -12, 12, -4, 0, 8);
  ctx.fill();
  ctx.restore();
}

// ---------- screens ----------

export function drawTitle(ctx, s, time) {
  // Dim the world behind the title.
  ctx.save();
  ctx.fillStyle = 'rgba(29,27,46,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
  // Title card.
  ctx.save();
  ctx.fillStyle = 'rgba(29,27,46,0.82)';
  rr(ctx, 190, 96, 900, 430, 18);
  ctx.fill();
  ctx.strokeStyle = '#e9c46a';
  ctx.lineWidth = 3;
  rr(ctx, 190, 96, 900, 430, 18);
  ctx.stroke();
  text(ctx, '🦃', 640, 158, '64px serif', '#fff', 'center');
  text(ctx, "GIBLET'S GREAT ESCAPE", 640, 226, 'bold 46px Georgia', '#ffe9a3', 'center');
  text(ctx, '3 farms · 9 ovens · 24 knives · 1 farmer · 0 dinners', 640, 268, 'bold 20px Georgia', '#fff4e0', 'center');
  text(ctx, 'Thanksgiving is tomorrow. Farmer Bram has the oven hot and the', 640, 316, '18px Georgia', '#fff4e0', 'center');
  text(ctx, 'carving knife sharpened. Run 900 metres to the forest gate —', 640, 342, '18px Georgia', '#fff4e0', 'center');
  text(ctx, 'jump the fences and ovens, duck the knives, hide in the haystacks,', 640, 368, '18px Georgia', '#fff4e0', 'center');
  text(ctx, 'and do not let Bram catch you.', 640, 394, '18px Georgia', '#fff4e0', 'center');
  // Controls line.
  text(ctx, 'SPACE / CLICK — jump, twice for a double jump      ↓ — hide in haystack      SHIFT — sprint', 640, 440, 'bold 15px Georgia', '#e9c46a', 'center');
  // Blinking start prompt.
  if (Math.sin(time * 4) > -0.2) {
    text(ctx, 'PRESS SPACE OR CLICK TO RUN', 640, 492, 'bold 22px Georgia', '#ffe9a3', 'center');
  }
  ctx.restore();
}

export function drawStageBanner(ctx, s) {
  if (s.bannerT <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, s.bannerT * 2);
  ctx.fillStyle = 'rgba(29,27,46,0.78)';
  rr(ctx, 340, 250, 600, 110, 14);
  ctx.fill();
  ctx.strokeStyle = '#e9c46a';
  ctx.lineWidth = 2;
  rr(ctx, 340, 250, 600, 110, 14);
  ctx.stroke();
  text(ctx, s.stage.name, 640, 292, 'bold 34px Georgia', '#ffe9a3', 'center');
  text(ctx, s.stage.sub, 640, 328, '16px Georgia', '#fff4e0', 'center');
  ctx.restore();
}

export function drawEnd(ctx, s, time) {
  ctx.save();
  ctx.fillStyle = s.escaped ? 'rgba(20,40,20,0.55)' : 'rgba(40,16,16,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = 'rgba(29,27,46,0.88)';
  rr(ctx, 240, 130, 800, 420, 18);
  ctx.fill();
  ctx.strokeStyle = s.escaped ? '#7ec850' : '#e8452a';
  ctx.lineWidth = 3;
  rr(ctx, 240, 130, 800, 420, 18);
  ctx.stroke();
  if (s.escaped) {
    text(ctx, '🦃', 640, 196, '64px serif', '#fff', 'center');
    text(ctx, 'ESCAPED!', 640, 262, 'bold 52px Georgia', '#a8e063', 'center');
    text(ctx, 'Giblet burst through the forest gate as the oven timer dinged.', 640, 312, '19px Georgia', '#fff4e0', 'center');
    text(ctx, 'Thanksgiving dinner is cancelled. Giblet lives to gobble another day.', 640, 340, '19px Georgia', '#fff4e0', 'center');
  } else {
    text(ctx, '🧑‍🌾', 640, 196, '64px serif', '#fff', 'center');
    text(ctx, 'CAUGHT!', 640, 262, 'bold 52px Georgia', '#ff8a6a', 'center');
    text(ctx, 'Farmer Bram caught up with Giblet just short of the forest gate.', 640, 312, '19px Georgia', '#fff4e0', 'center');
    text(ctx, 'The oven was already hot. The knife was already sharp.', 640, 340, '19px Georgia', '#fff4e0', 'center');
  }
  text(ctx, `FINAL SCORE  ${s.score}`, 640, 396, 'bold 26px Georgia', '#ffe9a3', 'center');
  text(
    ctx,
    `Distance ${Math.floor(s.distanceM)} m · Corn ${s.corn} · Stages cleared ${s.stagesCleared} · Best ${Math.max(s.score, s.bestScore)}`,
    640,
    430,
    '17px Georgia',
    '#fff4e0',
    'center',
  );
  if (Math.sin(time * 4) > -0.2) {
    text(ctx, 'PRESS R OR CLICK TO RUN AGAIN', 640, 492, 'bold 21px Georgia', '#ffe9a3', 'center');
  }
  ctx.restore();
}

export function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(29,27,46,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'PAUSED', 640, 330, 'bold 54px Georgia', '#ffe9a3', 'center');
  text(ctx, 'P to resume · M to mute', 640, 390, '18px Georgia', '#fff4e0', 'center');
  ctx.restore();
}

export { STAGES };
