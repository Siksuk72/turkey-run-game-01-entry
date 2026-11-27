// Keyboard + mouse input. One job: turn keys and clicks into the intents
// the game loop reads — jump, duck/hide, sprint, slow, pause, mute, restart.
// Held keys are tracked so holding Space never re-jumps, and a click on the
// canvas counts as a jump (mouse play, as the brief requires).

export class Input {
  constructor(canvas) {
    this.jumpPressed = false; // edge-triggered: true for one frame
    this.jumpHeld = false;
    this.down = false;
    this.sprint = false;
    this.slow = false;
    this.pausePressed = false;
    this.mutePressed = false;
    this.restartPressed = false;
    this.anyPressed = false; // any key/click: dismisses the title screen
    this._keys = new Set();
    this._canvas = canvas;
    this._onKeyDown = (e) => this._keydown(e);
    this._onKeyUp = (e) => this._keyup(e);
    this._onMouse = (e) => this._mouse(e);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('pointerdown', this._onMouse);
  }

  _keydown(e) {
    if (e.repeat) return;
    const k = e.key;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) {
      e.preventDefault();
    }
    this._keys.add(k);
    this.anyPressed = true;
    if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') {
      this.jumpPressed = true;
      this.jumpHeld = true;
    }
    if (k === 'ArrowDown' || k === 's' || k === 'S') this.down = true;
    if (k === 'Shift' || k === 'ArrowRight' || k === 'd' || k === 'D') this.sprint = true;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.slow = true;
    if (k === 'p' || k === 'P' || k === 'Escape') this.pausePressed = true;
    if (k === 'm' || k === 'M') this.mutePressed = true;
    if (k === 'r' || k === 'R' || k === 'Enter') this.restartPressed = true;
  }

  _keyup(e) {
    const k = e.key;
    this._keys.delete(k);
    if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') this.jumpHeld = false;
    if (k === 'ArrowDown' || k === 's' || k === 'S') this.down = false;
    if (k === 'Shift' || k === 'ArrowRight' || k === 'd' || k === 'D') this.sprint = false;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.slow = false;
  }

  _mouse(e) {
    e.preventDefault();
    this.anyPressed = true;
    this.jumpPressed = true;
    this.jumpHeld = true;
    // A click is a tap: release the hold on the next frame so a held mouse
    // button does not keep the turkey airborne forever.
    requestAnimationFrame(() => {
      this.jumpHeld = false;
    });
  }

  // Called at the end of every frame: edge triggers live for one frame only.
  endFrame() {
    this.jumpPressed = false;
    this.pausePressed = false;
    this.mutePressed = false;
    this.restartPressed = false;
    this.anyPressed = false;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this._canvas.removeEventListener('pointerdown', this._onMouse);
  }
}
