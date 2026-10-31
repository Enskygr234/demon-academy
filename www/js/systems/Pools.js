// Object pools for projectiles, one-shot effects, particles and damage numbers.
// Everything is recycled (setActive/setVisible false) rather than destroyed to avoid GC spikes on Android.
import { DEPTH, ELEMENT, FONT } from '../config.js';
import { GameState } from './GameState.js';

export const PROJ = {
  voidwave: { tex: 'wave', tint: 0xb05aff, scale: 1, body: [24, 70], life: 0.55, pierce: true, glow: 0x8a3ad6 },
  ice:      { tex: 'shard', tint: 0xaee8ff, scale: 1.2, body: [24, 12], life: 0.9, glow: 0x6ac8ff },
  fireball: { tex: 'orb', tint: 0xff8a2a, scale: 1.6, body: [26, 26], life: 1.1, trail: 0xffaa3a, glow: 0xff5a1a },
  light:    { tex: 'orb', tint: 0xfff0b0, scale: 1.1, body: [18, 18], life: 0.9, trail: 0xffe08a, glow: 0xffd23a },
  voidbolt: { tex: 'orb', tint: 0xc06aff, scale: 1.1, body: [18, 18], life: 2.4, glow: 0x8a3ad6 },
  voidball: { tex: 'orb', tint: 0xd07aff, scale: 1.8, body: [30, 30], life: 2.6, trail: 0xb05aff, glow: 0x6a1aaa },
  leaf:     { tex: 'fx_leaf', tint: null, scale: 1.2, body: [18, 18], life: 2.4, spin: 10 },
  laser:    { tex: 'bolt', tint: 0xff4a5a, scale: 1, body: [36, 8], life: 1.8, glow: 0xff2a3a },
  rock:     { tex: 'rock', tint: null, scale: 1.3, body: [26, 26], life: 3, gravity: 900, spin: 6 },
  slash:    { tex: 'wave', tint: 0xff2a4a, scale: 1.4, body: [28, 100], life: 2, glow: 0xaa0a2a },
  missile:  { tex: 'bolt', tint: 0xffb04a, scale: 0.9, body: [24, 10], life: 3.2, homing: 2.2, trail: 0xff8a2a },
  shock:    { tex: 'shockwave', tint: 0xc08aff, scale: 1.3, body: [56, 26], life: 1.6, glow: 0x8a3ad6, pierce: true },
  vorb:     { tex: 'orb', tint: 0xe0a0ff, scale: 1.5, body: [24, 24], life: 4, trail: 0xb05aff, glow: 0x6a1aaa },
};

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) { super(scene, x, y, 'orb'); }
  fire(x, y, vx, vy, opts) {
    const c = PROJ[opts.type] || PROJ.voidbolt;
    this.setTexture(c.tex).setActive(true).setVisible(true).setPosition(x, y);
    this.body.enable = true; this.body.reset(x, y);
    this.setScale(c.scale * (opts.scale || 1)); this.setDepth(DEPTH.projectiles);
    if (c.tint) this.setTint(opts.tint || c.tint); else this.clearTint();
    this.body.setSize(c.body[0] / Math.max(0.01, this.scaleX), c.body[1] / Math.max(0.01, this.scaleY));
    this.body.setAllowGravity(!!c.gravity); if (c.gravity) this.body.setGravityY(c.gravity - this.scene.physics.world.gravity.y);
    this.setVelocity(vx, vy);
    this.cfg = c; this.opts = opts; this.life = (opts.life || c.life); this.hitSet = new Set();
    this.dmg = opts.dmg; this.owner = opts.owner; this.element = opts.element || 'physical';
    this.setFlipX(vx < 0); this.rotation = c.spin ? 0 : Math.atan2(vy, Math.abs(vx)) * (vx < 0 ? -1 : 1);
    this.trailT = 0;
    this.setBlendMode(c.glow ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    return this;
  }
  preUpdate(t, dt) {
    super.preUpdate(t, dt);
    if (!this.active) return;
    const s = dt / 1000; this.life -= s;
    if (this.cfg.spin) this.rotation += this.cfg.spin * s;
    if (this.cfg.homing && this.opts.target && this.opts.target.active) {
      const tg = this.opts.target; const a = Math.atan2(tg.y - 40 - this.y, tg.x - this.x);
      const cur = Math.atan2(this.body.velocity.y, this.body.velocity.x);
      const na = Phaser.Math.Angle.RotateTo(cur, a, this.cfg.homing * s);
      const sp = this.body.velocity.length(); this.setVelocity(Math.cos(na) * sp, Math.sin(na) * sp); this.rotation = na; this.setFlipX(false);
    }
    if (this.cfg.trail) { this.trailT -= s; if (this.trailT <= 0) { this.trailT = 0.04; this.scene.fx?.particles(this.x, this.y, this.cfg.trail, 1, 40, 0.35); } }
    if (this.life <= 0) this.kill();
  }
  kill(explode = false) {
    if (!this.active) return;
    if (explode || this.opts.explode) this.scene.fx?.burst(this.x, this.y, this.cfg.glow || this.cfg.tint || 0xffffff, 0.6);
    this.setActive(false).setVisible(false); this.body.enable = false; this.setVelocity(0, 0);
  }
}

export class FxPool {
  constructor(scene) {
    this.scene = scene;
    this.sprites = scene.add.group({ maxSize: 60 });
    this.texts = scene.add.group({ maxSize: 40 });
    this.emitter = scene.add.particles(0, 0, 'px', {
      speed: { min: 60, max: 260 }, angle: { min: 0, max: 360 }, lifespan: { min: 250, max: 600 },
      scale: { start: 1.4, end: 0 }, alpha: { start: 1, end: 0 }, gravityY: 300, emitting: false, blendMode: 'ADD',
    }).setDepth(DEPTH.fx);
    this.trailEmitter = scene.add.particles(0, 0, 'px', {
      speed: { min: 5, max: 40 }, angle: { min: 0, max: 360 }, lifespan: { min: 200, max: 400 },
      scale: { start: 1.2, end: 0 }, alpha: { start: 0.9, end: 0 }, emitting: false, blendMode: 'ADD',
    }).setDepth(DEPTH.fx - 1);
    this.sparkEmitter = scene.add.particles(0, 0, 'spark', {
      speed: { min: 120, max: 340 }, angle: { min: 0, max: 360 }, lifespan: 260, scale: { start: 1.6, end: 0 }, emitting: false, blendMode: 'ADD',
    }).setDepth(DEPTH.fx);
  }
  particles(x, y, color, n = 8, speed = 200, life = 0.5) {
    const e = speed < 100 ? this.trailEmitter : this.emitter; e.particleTint = color;
    e.explode(n, x, y);
  }
  sparks(x, y, color, n = 6) { this.sparkEmitter.particleTint = color; this.sparkEmitter.explode(n, x, y); }
  get(tex) {
    let s = this.sprites.getFirstDead(false);
    if (!s) { if (this.sprites.getLength() >= this.sprites.maxSize) { s = this.sprites.getFirstAlive(); this.scene.tweens.killTweensOf(s); } else { s = this.scene.add.image(0, 0, tex); this.sprites.add(s); } }
    s.setTexture(tex).setActive(true).setVisible(true).setAlpha(1).setScale(1).setRotation(0).setFlip(false, false).clearTint().setOrigin(0.5).setBlendMode(Phaser.BlendModes.NORMAL).setDepth(DEPTH.fx);
    return s;
  }
  release(s) { s.setActive(false).setVisible(false); }
  // one-shot image effect that scales/fades out
  flash(tex, x, y, opts = {}) {
    const s = this.get(tex).setPosition(x, y);
    if (opts.tint) s.setTint(opts.tint);
    if (opts.add !== false) s.setBlendMode(Phaser.BlendModes.ADD);
    if (opts.flipX) s.setFlipX(true);
    if (opts.origin) s.setOrigin(...opts.origin);
    s.setScale(opts.from ?? 0.5); if (opts.rot) s.setRotation(opts.rot); if (opts.depth) s.setDepth(opts.depth);
    const props = { targets: s, alpha: 0, duration: opts.dur ?? 400, ease: 'Cubic.easeOut', onComplete: () => this.release(s) };
    if (opts.scaleX) { s.setScale(opts.scaleX, opts.from ?? 1); props.scaleY = 0.1; }
    else props.scale = opts.to ?? 1.5;
    this.scene.tweens.add(props);
    return s;
  }
  burst(x, y, color, size = 1) {
    this.flash('glow', x, y, { tint: color, from: 0.3 * size, to: 2.2 * size, dur: 350 });
    this.flash('ring', x, y, { tint: color, from: 0.1 * size, to: 1.1 * size, dur: 380 });
    this.particles(x, y, color, Math.round(10 * size), 240 * size, 0.6);
  }
  number(x, y, value, color = 0xffffff, crit = false) {
    if (!GameState.settings.damageNumbers) return;
    let t = this.texts.getFirstDead(false);
    if (!t) {
      if (this.texts.getLength() >= this.texts.maxSize) return;
      t = this.scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', stroke: '#140a24', strokeThickness: 4 }).setOrigin(0.5).setDepth(DEPTH.numbers);
      this.texts.add(t);
    }
    const col = typeof color === 'number' ? '#' + color.toString(16).padStart(6, '0') : color;
    t.setText(String(value)).setColor(col).setFontSize(crit ? 28 : 20).setPosition(x + Phaser.Math.Between(-10, 10), y).setActive(true).setVisible(true).setAlpha(1).setScale(crit ? 1.3 : 1);
    this.scene.tweens.add({ targets: t, y: y - 50, alpha: 0, scale: 1, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.setActive(false).setVisible(false) });
  }
}

export function elementColor(el) { return ELEMENT[el] ?? 0xffffff; }
