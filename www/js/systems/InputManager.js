// Unified input: keyboard + gamepad-like virtual touch controls feed the same action state.
// The UIScene writes touch state into `touch`; Player reads `get()` each frame.
export class InputManager {
  constructor(scene) {
    this.scene = scene;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = scene.input.keyboard ? scene.input.keyboard.addKeys({
      left: K.LEFT, right: K.RIGHT, up: K.UP, down: K.DOWN, a: K.A, d: K.D, w: K.W, s: K.S,
      jump: K.SPACE, attack: K.J, heavy: K.K, dash: K.L, shift: K.SHIFT, skill: K.I, ult: K.O, swap: K.Q,
      z: K.Z, x: K.X, c: K.C, v: K.V, b: K.B, potion: K.ONE, ether: K.TWO, walk: K.CTRL,
    }) : {};
    this.touch = { x: 0, y: 0, jump: false, attack: false, heavy: false, dash: false, skill: false, ult: false, swap: false };
    this.prev = {};
    this.state = {};
    this.enabled = true;
  }
  isDown(k) { return this.keys[k] && this.keys[k].isDown; }
  update() {
    const t = this.touch;
    let x = 0;
    if (this.isDown('left') || this.isDown('a')) x -= 1;
    if (this.isDown('right') || this.isDown('d')) x += 1;
    let walk = this.isDown('walk');
    if (t.x !== 0) { x = Math.sign(t.x); walk = Math.abs(t.x) < 0.55; }
    const btn = {
      jump: this.isDown('jump') || this.isDown('up') || this.isDown('w') || this.isDown('z') || t.jump,
      attack: this.isDown('attack') || this.isDown('x') || t.attack,
      heavy: this.isDown('heavy') || this.isDown('c') || t.heavy,
      dash: this.isDown('dash') || this.isDown('shift') || t.dash,
      skill: this.isDown('skill') || this.isDown('v') || t.skill,
      ult: this.isDown('ult') || this.isDown('b') || t.ult,
      swap: this.isDown('swap') || t.swap,
      potion: this.isDown('potion'), ether: this.isDown('ether'),
      down: this.isDown('down') || this.isDown('s') || t.y > 0.6,
    };
    const s = { x: this.enabled ? x : 0, walk, held: {}, pressed: {} };
    for (const [k, v] of Object.entries(btn)) {
      s.held[k] = this.enabled && v;
      s.pressed[k] = this.enabled && v && !this.prev[k];
      this.prev[k] = v;
    }
    this.state = s;
    return s;
  }
  reset() { for (const k of Object.keys(this.touch)) this.touch[k] = typeof this.touch[k] === 'number' ? 0 : false; }
}
