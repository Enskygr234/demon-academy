// Reusable anime-RPG styled UI widgets (panels, buttons, bars, text).
import { FONT, TITLE_FONT } from '../config.js';
import { Audio } from '../systems/AudioManager.js';

export function panel(scene, x, y, w, h, opts = {}) {
  const g = scene.add.graphics();
  const fill = opts.fill ?? 0x170d2b, edge = opts.edge ?? 0x8a5ad6, alpha = opts.alpha ?? 0.92;
  g.fillStyle(0x000000, 0.4).fillRoundedRect(x + 4, y + 5, w, h, 12);
  g.fillStyle(fill, alpha).fillRoundedRect(x, y, w, h, 12);
  g.fillStyle(0xffffff, 0.04).fillRoundedRect(x + 3, y + 3, w - 6, h * 0.35, 10);
  g.lineStyle(2, edge, 0.9).strokeRoundedRect(x, y, w, h, 12);
  g.lineStyle(1, 0xd8b8ff, 0.25).strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 9);
  // corner gems
  for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { g.fillStyle(edge, 1).fillRect(cx - 4, cy - 4, 8, 8); g.fillStyle(0xffffff, 0.6).fillRect(cx - 1, cy - 1, 2, 2); }
  return g;
}

export function text(scene, x, y, str, size = 20, color = '#efe6ff', opts = {}) {
  return scene.add.text(x, y, str, {
    fontFamily: opts.title ? TITLE_FONT : FONT, fontSize: size + 'px', color, fontStyle: opts.bold === false ? 'normal' : 'bold',
    stroke: opts.stroke ?? '#0b0716', strokeThickness: opts.strokeThickness ?? Math.max(2, size / 6), align: opts.align || 'left',
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined, lineSpacing: opts.lineSpacing || 4,
  }).setOrigin(opts.ox ?? 0, opts.oy ?? 0);
}

export function button(scene, x, y, label, onClick, opts = {}) {
  const w = opts.w ?? 240, h = opts.h ?? 48;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (state) => {
    g.clear();
    const base = opts.disabled ? 0x2a2438 : (state === 'down' ? 0x5a2a9a : state === 'over' ? 0x4a2a7e : (opts.color ?? 0x2e1a52));
    g.fillStyle(0x000000, 0.45).fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, 10);
    g.fillStyle(base, 0.95).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.fillStyle(0xffffff, state === 'over' ? 0.12 : 0.06).fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.42, 8);
    g.lineStyle(2, opts.disabled ? 0x5a5070 : (state === 'over' ? 0xe0b8ff : 0x9a6ae6), 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
  };
  draw('up');
  const t = text(scene, 0, 0, label, opts.size ?? 22, opts.disabled ? '#77708a' : (opts.textColor ?? '#f4ecff'), { ox: 0.5, oy: 0.5 });
  c.add([g, t]);
  c.setSize(w, h);
  const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: !opts.disabled });
  c.add(zone);
  if (!opts.disabled) {
    zone.on('pointerover', () => { draw('over'); c.setScale(1.03); });
    zone.on('pointerout', () => { draw('up'); c.setScale(1); });
    zone.on('pointerdown', () => { draw('down'); c.setScale(0.97); });
    zone.on('pointerup', () => { draw('over'); c.setScale(1); Audio.unlock(); Audio.play('ui'); onClick && onClick(); });
  }
  c.label = t; c.zone = zone; c.redraw = draw;
  return c;
}

export function bar(scene, x, y, w, h, color, opts = {}) {
  const g = scene.add.graphics();
  const api = {
    g, value: 1, ghost: 1,
    set(v) {
      this.value = Phaser.Math.Clamp(v, 0, 1);
      if (this.ghost < this.value) this.ghost = this.value;
      this.draw();
    },
    tick(dt) { if (this.ghost > this.value) { this.ghost = Math.max(this.value, this.ghost - dt * 0.6); this.draw(); } },
    draw() {
      g.clear();
      g.fillStyle(0x000000, 0.7).fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 4);
      g.fillStyle(0x2a1a3a, 1).fillRect(x, y, w, h);
      g.fillStyle(0xffffff, 0.7).fillRect(x, y, w * this.ghost, h);
      g.fillStyle(color, 1).fillRect(x, y, w * this.value, h);
      g.fillStyle(0xffffff, 0.25).fillRect(x, y, w * this.value, Math.max(1, h * 0.35));
      if (opts.ticks) for (let i = 1; i < opts.ticks; i++) g.fillStyle(0x000000, 0.35).fillRect(x + w * i / opts.ticks, y, 1, h);
    },
  };
  api.draw();
  return api;
}

export function fadeIn(scene, ms = 300) { scene.cameras.main.fadeIn(ms, 11, 7, 22); }
export function fadeTo(scene, key, data, ms = 300) {
  if (scene._leaving) return; scene._leaving = true;
  const cam = scene.cameras.main;
  cam.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
  cam.fade(ms, 11, 7, 22, true); // force: interrupts a running fade-in
  scene.events.once('shutdown', () => { scene._leaving = false; });
}

// Menu backdrop: animated starfield + vignette, reused by menus
export function backdrop(scene, opts = {}) {
  const { width: W, height: H } = scene.scale;
  scene.add.rectangle(0, 0, W, H, 0x0b0716).setOrigin(0);
  if (opts.image && scene.textures.exists(opts.image)) {
    const img = scene.add.image(W / 2, H / 2, opts.image); const s = Math.max(W / img.width, H / img.height); img.setScale(s).setAlpha(opts.alpha ?? 0.5);
  }
  const em = scene.add.particles(0, 0, 'px', {
    x: { min: 0, max: W }, y: H + 10, speedY: { min: -40, max: -15 }, speedX: { min: -8, max: 8 }, lifespan: 9000,
    scale: { min: 0.5, max: 1.5 }, alpha: { start: 0.9, end: 0 }, tint: [0xb06aff, 0xff4a8a, 0x6ac8ff], frequency: 120, blendMode: 'ADD',
  });
  const v = scene.add.graphics();
  for (let i = 0; i < 10; i++) { v.lineStyle(40, 0x000000, 0.05 * i); v.strokeRect(-20 + i * 2, -20 + i * 2, W + 40 - i * 4, H + 40 - i * 4); }
  return em;
}
