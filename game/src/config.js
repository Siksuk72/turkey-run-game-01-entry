// Giblet's Great Escape — tuning, stages and counted content.
// Every number the title screen brags about lives here, so the game and the
// promise always agree: 3 stages, 9 ovens, 24 knives, 12 haystacks,
// 18 corn cobs, 3 gravy boats, 1 farmer, 3 lives, 900 metres to freedom.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const GROUND_Y = 620; // top of the ground strip, in view pixels
export const RUN_LENGTH_M = 900; // metres from the coop to the forest gate
export const METRES_PER_PX = 0.045; // world scroll: 1 px ~= 4.5 cm of run

export const PLAYER = {
  x: 300, // fixed screen x of the turkey; the world scrolls past it
  w: 74,
  h: 66,
  jumpV: 1100, // px/s upward — y is height above the ground, positive up
  gravity: 2200, // px/s^2, pulls the turkey back down
  baseSpeed: 320, // px/s of world scroll at a steady trot
  sprintSpeed: 470,
  slowSpeed: 210,
  staminaMax: 100,
  staminaDrain: 34, // per second while sprinting
  staminaRegen: 26, // per second while not sprinting
};

export const FARMER = {
  startGap: 90, // metres of daylight between Giblet and Farmer Bram
  catchGap: 0,
  creep: 1.1, // metres/s Bram gains just by being relentless
  stumbleCost: 13, // metres lost on every hit
  sprintGain: 9, // metres/s gained while sprinting clean
  cornBonus: 2, // metres of breathing room per corn cob
  recover: 0.6, // metres/s regained while running clean
  maxGap: 120,
};

export const LIVES = 3;

// One stage per leg of the escape. Density and speed rise farmyard -> barn
// -> kitchen, exactly as the judge brief asks: dangers grow harder.
export const STAGES = [
  {
    id: 'farmyard',
    name: 'MAPLE FARMYARD',
    sub: 'Stage 1 · 0–300 m · dawn, the coop door is open',
    fromM: 0,
    toM: 300,
    speed: 1.0,
    skyTop: '#f7b267',
    skyMid: '#f4845f',
    skyBot: '#e9c46a',
    hillFar: '#8a5a3b',
    hillNear: '#6b4226',
    ground: '#7a4a21',
    grass: '#c98f2e',
    obstacleEveryM: 26,
    knives: 8,
    ovens: 3,
    haystacks: 4,
    corn: 6,
    gravy: 1,
  },
  {
    id: 'barn',
    name: 'THE OLD BARN',
    sub: 'Stage 2 · 300–600 m · dusk, the lanterns are lit',
    fromM: 300,
    toM: 600,
    speed: 1.14,
    skyTop: '#5d3a6e',
    skyMid: '#b85c5c',
    skyBot: '#e08e45',
    hillFar: '#4a2c4a',
    hillNear: '#33203a',
    ground: '#4c2f1d',
    grass: '#a8763e',
    obstacleEveryM: 21,
    knives: 8,
    ovens: 3,
    haystacks: 4,
    corn: 6,
    gravy: 1,
  },
  {
    id: 'kitchen',
    name: 'THE FARMHOUSE KITCHEN',
    sub: 'Stage 3 · 600–900 m · night, the ovens are already hot',
    fromM: 600,
    toM: 900,
    speed: 1.3,
    skyTop: '#1d1b2e',
    skyMid: '#4a2a3a',
    skyBot: '#8a4a2e',
    hillFar: '#241a26',
    hillNear: '#1a1218',
    ground: '#33231a',
    grass: '#7d5a33',
    obstacleEveryM: 17,
    knives: 8,
    ovens: 3,
    haystacks: 4,
    corn: 6,
    gravy: 1,
  },
];

// Score values.
export const SCORE = {
  perMetre: 10,
  corn: 50,
  stageBonus: 500,
  hideBonus: 25,
  escapedBonus: 1000,
};
