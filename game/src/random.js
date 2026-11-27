// Seeded random numbers (mulberry32) so the world generator and the
// screenshot states are deterministic: the same seed always deals the same
// farm, the same kitchen, the same run.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an item from an array with a seeded roll.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Integer in [min, max] with a seeded roll.
export function intBetween(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
