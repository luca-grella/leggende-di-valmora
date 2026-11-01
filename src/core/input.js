// Keyboard, mouse and touch input in one place. Touch: left half of the screen
// is a floating joystick, right half drags the camera, plus on-screen buttons.

export class Input {
  constructor(canvas, touchUI) {
    this.keys = new Set();
    this.edges = new Set(); // actions pressed since last frame
    this.move = { x: 0, y: 0 };
    this.cam = { dx: 0, dy: 0, zoom: 0 };
    this.runToggle = false;
    this.joy = null;
    this.camTouch = null;
    this.pinch = null;
    this.enabled = true;

    const map = { KeyE: 'a', Enter: 'a', Space: 'jump', Escape: 'b', Backspace: 'b', KeyM: 'map', KeyP: 'menu', Tab: 'menu', KeyR: 'run' };
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      const act = map[e.code];
      if (act) { this.edges.add(act); if (e.code === 'Tab' || e.code === 'Space') e.preventDefault(); }
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    let dragging = false, lx = 0, ly = 0;
    canvas.addEventListener('mousedown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; });
    addEventListener('mouseup', () => (dragging = false));
    addEventListener('mousemove', (e) => {
      if (!dragging) return;
      this.cam.dx += e.clientX - lx; this.cam.dy += e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
    });
    canvas.addEventListener('wheel', (e) => { this.cam.zoom += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // touch
    const joyBase = touchUI.joyBase, joyKnob = touchUI.joyKnob;
    canvas.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.45 && !this.joy) {
          this.joy = { id: t.identifier, ox: t.clientX, oy: t.clientY };
          joyBase.style.display = 'block';
          joyBase.style.left = `${t.clientX}px`; joyBase.style.top = `${t.clientY}px`;
          joyKnob.style.transform = 'translate(-50%, -50%)';
        } else if (!this.camTouch) {
          this.camTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
        } else if (!this.pinch) {
          const a = this.camTouch;
          this.pinch = { id: t.identifier, d: Math.hypot(t.clientX - a.x, t.clientY - a.y) };
        }
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (this.joy && t.identifier === this.joy.id) {
          const R = 55;
          let dx = t.clientX - this.joy.ox, dy = t.clientY - this.joy.oy;
          const d = Math.hypot(dx, dy);
          if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
          this.move.x = dx / R; this.move.y = -dy / R;
          joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        } else if (this.camTouch && t.identifier === this.camTouch.id) {
          this.cam.dx += (t.clientX - this.camTouch.x) * 1.4;
          this.cam.dy += (t.clientY - this.camTouch.y) * 1.4;
          this.camTouch.x = t.clientX; this.camTouch.y = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (this.joy && t.identifier === this.joy.id) {
          this.joy = null; this.move.x = 0; this.move.y = 0;
          joyBase.style.display = 'none';
        }
        if (this.camTouch && t.identifier === this.camTouch.id) this.camTouch = null;
        if (this.pinch && t.identifier === this.pinch.id) this.pinch = null;
      }
    };
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchcancel', end);

    const bind = (el, act) => el && el.addEventListener('pointerdown', (e) => { this.edges.add(act); e.preventDefault(); e.stopPropagation(); });
    bind(touchUI.btnA, 'a');
    bind(touchUI.btnMenu, 'menu');
    bind(touchUI.btnMap, 'map');
    bind(touchUI.btnJump, 'jump');
    if (touchUI.btnRun) touchUI.btnRun.addEventListener('pointerdown', (e) => {
      this.runToggle = !this.runToggle;
      touchUI.btnRun.classList.toggle('on', this.runToggle);
      e.preventDefault();
    });
  }

  // movement vector from keys or joystick, y = forward
  axis() {
    let x = 0, y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l, mag: 1 }; }
    const mag = Math.min(Math.hypot(this.move.x, this.move.y), 1);
    return { x: this.move.x, y: this.move.y, mag };
  }

  get running() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.runToggle || (this.joy && Math.hypot(this.move.x, this.move.y) > 0.95);
  }

  pressed(act) {
    return this.edges.has(act);
  }

  endFrame() {
    this.edges.clear();
    this.cam.dx = 0; this.cam.dy = 0; this.cam.zoom = 0;
  }
}
