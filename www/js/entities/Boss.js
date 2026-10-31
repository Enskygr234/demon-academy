// Boss: procedural animation of the supplied boss designs + pattern-based attack AI with phases.
import { BOSSES } from '../data/bosses.js';
import { DEPTH, ELEMENT } from '../config.js';
import { Audio } from '../systems/AudioManager.js';
import { IMAGE_FACING } from './Enemy.js';

const SHOT = { golem: 'rock', guardian: 'rock', proto: 'missile', crimson: 'slash', director: 'vorb' };
const COLOR = { golem: 0x8ab8ff, guardian: 0x6ac8ff, proto: 0xff5a4a, crimson: 0xff2a4a, director: 0xb05aff };

export class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, key, arena) {
    const def = BOSSES[key];
    super(scene, x, y, def.image);
    scene.add.existing(this); scene.physics.add.existing(this);
    this.def = def; this.key = key; this.arena = arena;
    this.maxHp = def.hp; this.hp = def.hp; this.color = COLOR[key];
    this.baseScale = def.scale || 1; this.setScale(this.baseScale);
    if (def.tint) this.setTint(def.tint);
    this.setOrigin(0.5, 1).setDepth(DEPTH.boss);
    const [bw, bh] = def.body;
    this.body.setSize(bw / this.baseScale, bh / this.baseScale); this.body.setOffset((this.width - bw / this.baseScale) / 2, this.height - bh / this.baseScale);
    this.baseFacing = IMAGE_FACING[def.image] ?? 1; this.facing = -1;
    this.flying = !!def.flying; if (this.flying) this.body.setAllowGravity(false);
    this.state = 'intro'; this.t = 0; this.phase = 1; this.speedMult = 1; this.busy = true; this.dead = false;
    this.patterns = [...def.patterns]; this.lastPattern = null; this.contactCd = 0;
    this.shadow = scene.add.image(x, arena.floor, 'shadow').setDepth(DEPTH.boss - 1).setScale(bw / 40, 1.6);
    this.aura = scene.add.image(x, y, 'glow').setDepth(DEPTH.boss - 1).setTint(this.color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setScale(bw / 22);
  }

  wait(ms) { return new Promise(res => this.scene.time.delayedCall(ms / this.speedMult, res)); }
  get player() { return this.scene.player; }

  start() { this.state = 'fight'; this.busy = false; this.nextT = 0.8; Audio.play('boss_roar'); }

  preUpdate(t, dt) {
    super.preUpdate(t, dt);
    if (!this.active) return;
    const s = dt / 1000; this.t += s;
    this.shadow.setPosition(this.x, this.arena.floor);
    this.aura.setPosition(this.x, this.y - this.def.body[1] / 2).setAlpha(0.25 + Math.sin(this.t * 3) * 0.1);
    if (this.dead) return;
    this.setFlipX(this.facing !== this.baseFacing);
    // breathing / hover
    if (!this.tweening) {
      const b = Math.sin(this.t * (this.phase > 1 ? 4 : 2.5));
      this.setScale(this.baseScale * (1 - b * 0.015), this.baseScale * (1 + b * 0.025));
    }
    if (this.flying && !this.busy && this.state === 'fight') {
      const tx = Phaser.Math.Clamp(this.player.x + (this.x < this.player.x ? -220 : 220), this.arena.x0 + 80, this.arena.x1 - 80);
      const ty = this.arena.floor - 120 + Math.sin(this.t * 1.7) * 30;
      this.body.setVelocity((tx - this.x) * 1.2, (ty - this.y) * 2);
    }
    this.contactCd -= s;
    if (this.state === 'fight' && this.contactCd <= 0 && this.scene.physics.overlap(this, this.player)) {
      if (this.player.takeDamage(this.def.dmg * (this.charging ? 1.3 : 0.7), this.x)) this.contactCd = 0.6;
    }
    if (this.state !== 'fight' || this.busy) return;
    this.facing = Math.sign(this.player.x - this.x) || this.facing;
    if (!this.flying) { // approach slowly between patterns
      const dx = this.player.x - this.x;
      this.body.setVelocityX(Math.abs(dx) > 160 ? Math.sign(dx) * this.def.speed * 0.6 * this.speedMult : 0);
    }
    this.nextT -= s;
    if (this.nextT <= 0) this.runPattern();
  }

  async runPattern() {
    this.busy = true; this.body.setVelocityX(0);
    let options = this.patterns.filter(p => p !== this.lastPattern);
    const p = Phaser.Utils.Array.GetRandom(options.length ? options : this.patterns); this.lastPattern = p;
    try { await this[p](); } catch (e) { console.warn('boss pattern', p, e); }
    if (this.dead || !this.active) return;
    this.busy = false; this.nextT = Phaser.Math.FloatBetween(0.7, 1.4) / this.speedMult;
  }

  async telegraph(ms = 600) {
    this.setTintFill(0xffffff); this.scene.time.delayedCall(80, () => this.restoreTint());
    this.scene.fx.flash('glow', this.x, this.y - this.def.body[1] / 2, { tint: this.color, from: 1, to: 3.5, dur: ms });
    this.tweening = true;
    this.scene.tweens.add({ targets: this, scaleY: this.baseScale * 0.9, scaleX: this.baseScale * 1.08, duration: ms * 0.8 / this.speedMult, yoyo: true, onComplete: () => (this.tweening = false) });
    await this.wait(ms);
  }
  restoreTint() { if (!this.active) return; if (this.def.tint) this.setTint(this.def.tint); else this.clearTint(); if (this.phase > 1) this.setTint(this.def.tint ? this.def.tint : 0xffb0c0); }

  // ---------------- patterns
  async charge() {
    await this.telegraph(650); if (this.dead) return;
    this.charging = true; const dir = this.facing; const sp = (this.key === 'crimson' ? 720 : 560) * this.speedMult;
    if (this.flying) this.body.setVelocityY(0);
    this.body.setVelocityX(dir * sp); Audio.play('dash');
    for (let i = 0; i < 40 && !this.dead; i++) {
      await this.wait(25);
      this.scene.fx.particles(this.x - dir * 40, this.y - 40, this.color, 2, 60, 0.4);
      if (this.body.blocked.left || this.body.blocked.right || this.x < this.arena.x0 + 60 || this.x > this.arena.x1 - 60) break;
    }
    this.body.setVelocityX(0); this.charging = false; this.scene.shake(0.006, 150);
    await this.wait(300);
  }
  async slam() {
    if (this.flying) return this.spikes();
    await this.telegraph(400); if (this.dead) return;
    const dx = Phaser.Math.Clamp(this.player.x - this.x, -380, 380);
    this.body.setVelocity(dx * 1.4, -720); Audio.play('jump');
    await this.wait(250);
    while (!this.body.blocked.down && !this.dead) await this.wait(30);
    this.body.setVelocityX(0); if (this.dead) return;
    Audio.play('slam'); this.scene.shake(0.015, 350);
    this.scene.fx.flash('shockwave', this.x, this.y - 10, { tint: this.color, from: 1, to: 5, dur: 400 });
    for (const d of [-1, 1]) this.scene.pools.enemyShots.get()?.fire(this.x + d * 50, this.y - 18, d * 380, 0, { type: 'shock', dmg: this.def.dmg, owner: this, tint: this.color });
    if (Math.abs(this.player.x - this.x) < 120 && this.player.body.blocked.down) this.player.takeDamage(this.def.dmg * 1.2, this.x);
    await this.wait(450);
  }
  async rain() {
    await this.telegraph(450); if (this.dead) return;
    const n = 7 + this.phase * 2;
    for (let i = 0; i < n && !this.dead; i++) {
      const x = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-260, 260), this.arena.x0 + 40, this.arena.x1 - 40);
      const mark = this.scene.fx.flash('shadow', x, this.arena.floor - 2, { tint: 0xff3a3a, add: false, from: 0.6, to: 1.4, dur: 700 });
      this.scene.time.delayedCall(450 / this.speedMult, () => this.active && this.scene.pools.enemyShots.get()?.fire(x, this.scene.cameras.main.scrollY - 20, 0, 420, { type: SHOT[this.key] === 'rock' ? 'rock' : 'vorb', dmg: this.def.dmg * 0.8, owner: this }));
      await this.wait(160);
    }
    await this.wait(500);
  }
  async fan() {
    await this.telegraph(450); if (this.dead) return;
    const type = SHOT[this.key]; const n = 5 + (this.phase > 1 ? 2 : 0);
    for (let burst = 0; burst < (this.phase > 1 ? 2 : 1); burst++) {
      const base = Math.atan2(this.player.y - 40 - (this.y - this.def.body[1] * 0.6), this.player.x - this.x);
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.16; const sp = type === 'missile' ? 260 : 340;
        this.scene.pools.enemyShots.get()?.fire(this.x + this.facing * 40, this.y - this.def.body[1] * 0.6, Math.cos(a) * sp, Math.sin(a) * sp, { type, dmg: this.def.dmg * 0.7, owner: this, target: this.player });
      }
      Audio.play('shoot'); await this.wait(500);
    }
    await this.wait(300);
  }
  async wave() {
    for (let i = 0; i < (this.phase > 1 ? 3 : 2) && !this.dead; i++) {
      await this.telegraph(380); if (this.dead) return;
      this.facing = Math.sign(this.player.x - this.x) || 1;
      this.scene.pools.enemyShots.get()?.fire(this.x + this.facing * 60, this.arena.floor - 50, this.facing * 420, 0, { type: 'slash', dmg: this.def.dmg * 0.9, owner: this, tint: this.color });
      Audio.play('sword'); this.scene.fx.flash('fx_arc', this.x + this.facing * 70, this.y - 70, { tint: this.color, flipX: this.facing < 0, from: 1, to: 1.6, dur: 250 });
    }
    await this.wait(400);
  }
  async beam() {
    const dir = this.facing; const y = this.flying ? this.player.y - 40 : this.y - this.def.body[1] * 0.45;
    if (this.flying) { this.body.setVelocity(0, 0); }
    const warn = this.scene.add.rectangle(dir > 0 ? this.x : this.x - 900, y, 900, 6, this.color, 0.6).setOrigin(0, 0.5).setDepth(DEPTH.fx);
    this.scene.tweens.add({ targets: warn, alpha: 0.15, yoyo: true, repeat: 4, duration: 90 });
    await this.telegraph(850); warn.destroy(); if (this.dead) return;
    Audio.play('ult'); this.scene.shake(0.01, 400);
    const b = this.scene.fx.flash('beam', this.x + dir * 30, y, { tint: this.color, origin: [dir > 0 ? 0 : 1, 0.5], scaleX: 900 / 64, from: 1.4, dur: 650 });
    b.setScale(900 / 64, 1.6);
    const p = this.player, rect = new Phaser.Geom.Rectangle(dir > 0 ? this.x : this.x - 900, y - 28, 900, 56);
    for (let i = 0; i < 4; i++) { if (Phaser.Geom.Rectangle.Overlaps(rect, new Phaser.Geom.Rectangle(p.body.x, p.body.y, p.body.width, p.body.height))) { p.takeDamage(this.def.dmg * 1.1, this.x); break; } await this.wait(90); }
    await this.wait(400);
  }
  async teleport() {
    this.tweening = true;
    await new Promise(r => this.scene.tweens.add({ targets: [this, this.aura], alpha: 0, duration: 250, onComplete: r }));
    if (this.dead) return;
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = Phaser.Math.Clamp(this.player.x + side * 120, this.arena.x0 + 60, this.arena.x1 - 60);
    this.setPosition(x, this.flying ? this.player.y - 30 : this.arena.floor); this.body.reset(this.x, this.y);
    this.facing = Math.sign(this.player.x - x) || 1;
    this.scene.fx.burst(x, this.y - 60, this.color, 1.2);
    await new Promise(r => this.scene.tweens.add({ targets: [this, this.aura], alpha: 1, duration: 200, onComplete: r }));
    this.tweening = false;
    await this.wait(250); if (this.dead) return;
    const r = new Phaser.Geom.Rectangle(this.facing > 0 ? this.x : this.x - 150, this.y - 140, 150, 140);
    this.scene.fx.flash('fx_arc', this.x + this.facing * 80, this.y - 70, { tint: this.color, flipX: this.facing < 0, from: 1.4, to: 2, dur: 250 });
    Audio.play('sword');
    const p = this.player; if (Phaser.Geom.Rectangle.Overlaps(r, new Phaser.Geom.Rectangle(p.body.x, p.body.y, p.body.width, p.body.height))) p.takeDamage(this.def.dmg, this.x);
    await this.wait(400);
  }
  async summon() {
    await this.telegraph(600); if (this.dead) return;
    const types = this.scene.levelDef.enemies.filter(t => t !== 'drone');
    for (let i = 0; i < (this.phase > 1 ? 3 : 2); i++) {
      const x = Phaser.Math.Clamp(this.x + Phaser.Math.Between(-240, 240), this.arena.x0 + 60, this.arena.x1 - 60);
      this.scene.fx.burst(x, this.arena.floor - 40, this.color, 1);
      this.scene.spawnEnemy(Phaser.Utils.Array.GetRandom(types), x, this.arena.floor - 10);
    }
    await this.wait(700);
  }
  async spikes() {
    const n = 3 + this.phase;
    for (let i = 0; i < n && !this.dead; i++) {
      const x = this.player.x + (i === 0 ? 0 : Phaser.Math.Between(-80, 80));
      const warn = this.scene.fx.flash('glow', x, this.arena.floor, { tint: this.color, from: 1.2, to: 0.6, dur: 550 });
      await this.wait(520); if (this.dead) return;
      this.scene.fx.flash('fx_voidspike', x, this.arena.floor + 4, { origin: [0.5, 1], from: 1.1, to: 1.5, dur: 500, add: false });
      this.scene.shake(0.004, 100); Audio.play('void');
      const p = this.player; if (Math.abs(p.x - x) < 55 && p.y > this.arena.floor - 120) p.takeDamage(this.def.dmg, x);
    }
    await this.wait(300);
  }
  async leap() {
    await this.telegraph(450); if (this.dead) return;
    const tx = this.player.x;
    this.body.setVelocity((tx - this.x) * 1.15, -860); Audio.play('jump');
    await this.wait(300);
    while (!this.body.blocked.down && !this.dead) await this.wait(30);
    if (this.dead) return; this.body.setVelocityX(0);
    Audio.play('slam'); this.scene.shake(0.016, 300);
    this.scene.fx.burst(this.x, this.y - 20, this.color, 1.6);
    if (Math.abs(this.player.x - this.x) < 150 && this.player.y > this.y - 80) this.player.takeDamage(this.def.dmg * 1.3, this.x);
    await this.wait(500);
  }
  async orbs() {
    await this.telegraph(500); if (this.dead) return;
    const n = this.phase >= 3 ? 16 : (this.phase > 1 ? 12 : 9); const off = Math.random();
    for (let i = 0; i < n; i++) {
      const a = off + i / n * Math.PI * 2;
      this.scene.pools.enemyShots.get()?.fire(this.x, this.y - this.def.body[1] / 2, Math.cos(a) * 220, Math.sin(a) * 220, { type: 'vorb', dmg: this.def.dmg * 0.6, owner: this });
    }
    Audio.play('void'); await this.wait(800);
  }

  // ---------------- damage
  takeDamage(amount, opts = {}) {
    if (this.dead || this.state !== 'fight') return 0;
    const crit = Math.random() < (opts.crit || 0);
    const dmg = Math.max(1, Math.round(amount * (crit ? 1.8 : 1) * Phaser.Math.FloatBetween(0.92, 1.08)));
    this.hp -= dmg;
    this.scene.fx.number(this.x + Phaser.Math.Between(-30, 30), this.y - this.def.body[1] - 10, dmg, crit ? 0xffe04a : (ELEMENT[opts.element] ?? 0xffffff), crit);
    this.setTintFill(0xffffff); this.scene.time.delayedCall(60, () => this.restoreTint());
    this.scene.fx.sparks(this.x, this.y - this.def.body[1] / 2, ELEMENT[opts.element] ?? 0xffffff, 6); Audio.play('hit');
    this.scene.events.emit('boss-hp', this.hp / this.maxHp);
    if (this.hp <= 0) { this.die(); return dmg; }
    const r = this.hp / this.maxHp;
    if (this.phase === 1 && r <= this.def.phase2) this.enterPhase(2);
    if (this.phase === 2 && this.def.phase3 && r <= this.def.phase3) this.enterPhase(3);
    return dmg;
  }
  enterPhase(n) {
    this.phase = n; this.speedMult = n === 2 ? 1.3 : 1.55; this.patterns.push(...(n === 2 ? this.def.phase2Add : ['orbs']));
    Audio.play('boss_roar'); this.scene.shake(0.012, 600);
    this.scene.cameras.main.flash(300, (this.color >> 16) & 255, (this.color >> 8) & 255, this.color & 255);
    this.scene.toast(`${this.def.name} grows furious!`);
    this.aura.setScale(this.aura.scaleX * 1.3); this.restoreTint();
  }
  async die() {
    this.dead = true; this.hp = 0; this.body.setVelocity(0, 0); this.body.setAllowGravity(!this.flying ? true : false);
    this.scene.events.emit('boss-hp', 0); Audio.stopMusic(); Audio.play('boss_roar');
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 180, () => {
        if (!this.scene) return;
        this.scene.fx.burst(this.x + Phaser.Math.Between(-60, 60), this.y - Phaser.Math.Between(20, this.def.body[1]), this.color, 1.2); Audio.play('explode'); this.scene.shake(0.01, 150);
      });
    }
    this.scene.time.delayedCall(1500, () => {
      if (!this.scene) return;
      this.scene.cameras.main.flash(500, 255, 255, 255);
      this.scene.tweens.add({ targets: [this, this.aura, this.shadow], alpha: 0, duration: 600, onComplete: () => { const sc = this.scene; this.aura.destroy(); this.shadow.destroy(); this.destroy(); sc.onBossDefeated(this.key); } });
    });
  }
}
