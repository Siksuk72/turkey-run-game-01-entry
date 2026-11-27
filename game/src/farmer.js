// Farmer Bram: the chase. He is not an obstacle you jump over — he is a
// gap, measured in metres, that closes whenever Giblet stumbles and opens
// whenever Giblet runs clean or sprints. He searches, he corners, and when
// the gap hits zero the run is over. The gap is the game's real health bar:
// hearts only decide how many stumbles you can afford before he is on you.

import { FARMER } from './config.js';

export class Farmer {
  constructor() {
    this.gap = FARMER.startGap;
    this.shouted = false; // has he shouted his "nearly got you" this run?
    this.patience = 0; // seconds since the last stumble (for the search pose)
  }

  reset() {
    this.gap = FARMER.startGap;
    this.shouted = false;
    this.patience = 0;
  }

  // dt seconds; flags say what Giblet did this frame.
  update(dt, { sprinting, stumbling, cleanRunning, hidden }) {
    if (stumbling) {
      this.patience = 0;
    } else {
      this.patience += dt;
    }
    // Bram is relentless: the gap always creeps shut a little — unless
    // Giblet is hidden in a haystack, where Bram storms past searching.
    if (!hidden) this.gap -= FARMER.creep * dt;
    if (sprinting && cleanRunning) this.gap += FARMER.sprintGain * dt;
    if (cleanRunning && !sprinting) this.gap += FARMER.recover * dt;
    if (this.gap > FARMER.maxGap) this.gap = FARMER.maxGap;
    if (this.gap < 0) this.gap = 0;
  }

  // A hit: Bram lunges forward by the stumble cost.
  onStumble() {
    this.gap -= FARMER.stumbleCost;
    if (this.gap < 0) this.gap = 0;
  }

  onCorn() {
    this.gap += FARMER.cornBonus;
    if (this.gap > FARMER.maxGap) this.gap = FARMER.maxGap;
  }

  get caught() {
    return this.gap <= FARMER.catchGap;
  }

  // 0..1: how close he is (1 = breathing down Giblet's neck).
  get closeness() {
    return 1 - this.gap / FARMER.maxGap;
  }

  // Screen x of Bram's feet: he runs behind Giblet, closer as the gap closes.
  // Giblet sits at x=300; Bram trails from x=60 (far) to x=215 (on top of him).
  get screenX() {
    return 60 + this.closeness * 155;
  }

  // Should Bram shout this frame? Once per close call.
  maybeShout(sounds) {
    if (this.closeness > 0.82 && !this.shouted) {
      this.shouted = true;
      if (sounds) sounds.farmerShout();
    }
    if (this.closeness < 0.5) this.shouted = false;
  }
}
