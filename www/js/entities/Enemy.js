// Enemy with state-machine AI (patrol / chase / attack / cast / dash / leap / hover), status effects and loot.
import { ENEMIES } from '../data/enemies.js';
import { DEPTH, ELEMENT } from '../config.js';
import { Audio } from '../systems/AudioManager.js';

// Which way the supplied static designs face (1 = right). Atlas sheets all face right.
export const IMAGE_FACING = { drone: 1, experiment: -1, guardian: 1, proto: 1, crimson: 1, director: -1 };

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type, levelMult = 1) {
    const def = ENEMIES[type];
    super(scene, x, y, def.atlas || def.image, def.atlas ? 'idle_0' : undefined);
    scene.add.existing(this); scene.physics.add.existing(this);
    this.def = def; this.type = type; this.isAtlas = !!def.atlas;
    this.maxHp = Math.round(def.hp * levelMult); this.hp = this.maxHp; this.dmg = def.dmg * (0.85 + levelMult * 0.15);
    this.levelMult = levelMult;
    this.setDepth(DEPTH.enemies);
    const [bw, bh] = def.body;
    if (this.isAtlas) {
      const m = scene.cache.json.get('sprite_meta')[def.atlas];
      this.setOrigin(m.anchorX / m.frameW, m.anchorY / m.frameH);
      this.body.setSize(bw, bh); this.body.setOffset(m.anchorX - bw / 2, m.anchorY - bh);
      this.playA('idle');
    } else {
      this.setOrigin(0.5, 1);
      this.body.setSize(bw, bh); this.body.setOffset((this.width - bw) / 2, this.height - bh);
      this.baseFacing = IMAGE_FACING[def.image] ?? 1;
    }
    if (def.ai === 'flyer') { this.body.setAllowGravity(false); this.homeY = y - 20; this.y = this.homeY; }
    this.state = 'patrol'; this.facing = Math.random() < 0.5 ? -1 : 1; this.cd = 1 + Math.random(); this.t = Math.random() * 10;
    this.status = { burn: 0, burnDps: 0, slow: 0, slowMult: 1, freeze: 0 };
    this.patrolTimer = 2; this.alerted = false; this.hitThisAttack = false;
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(DEPTH.enemies - 1).setAlpha(0.6).setScale(bw / 50, 1);
    this.hpBar = scene.add.graphics().setDepth(DEPTH.enemies + 1);
    this.on('animationcomplete', this.onAnimDone, this);
  }

  playA(logical, force = false) {
    if (!this.isAtlas) return;
    const name = this.def.anims[logical] || logical; const k = `${this.def.atlas}_${name}`;
    if (!this.scene.anims.exists(k)) return;
    if (!force && this.anims.currentAnim?.key === k && this.anims.isPlaying) return;
    this.play(k);
  }

  get player() { return this.scene.player; }

  preUpdate(t, dt) {
    super.preUpdate(t, dt);
    if (!this.active) return;
    const s = dt / 1000; this.t += s;
    this.shadow.setPosition(this.x, this.groundY ?? this.y).setVisible(this.def.ai === 'flyer' || this.body.blocked.down);
    if (this.def.ai === 'flyer') { const gy = this.scene.groundBelow(this.x, this.y); this.groundY = gy; }
    else this.groundY = this.y;
    this.drawHp();
    if (this.state === 'dead') return;
    // statuses
    const st = this.status;
    if (st.burn > 0) { st.burn -= s; st.burnTick = (st.burnTick || 0) - s; if (st.burnTick <= 0) { st.burnTick = 0.5; this.takeDamage(st.burnDps * 0.5, { element: 'fire', noKb: true, dot: true }); this.scene.fx.particles(this.x, this.y - this.def.body[1] / 2, 0xff8a2a, 4, 60, 0.4); } }
    if (st.slow > 0) st.slow -= s; else st.slowMult = 1;
    if (st.freeze > 0) {
      st.freeze -= s; this.body.setVelocityX(0); if (this.anims) this.anims.pause();
      if (st.freeze <= 0) { this.clearTint(); this.anims?.resume(); }
      return;
    }
    if (this.state === 'hurt') { this.hurtT -= s; if (this.hurtT <= 0) this.state = 'chase'; return; }
    this.think(s);
    // visual facing
    if (this.isAtlas) this.setFlipX(this.facing < 0);
    else { this.setFlipX(this.facing !== this.baseFacing); this.proceduralAnim(); }
  }

  think(s) {
    const p = this.player; if (!p) return;
    const dx = p.x - this.x, dy = p.y - this.y, adx = Math.abs(dx);
    const ai = this.def.ai; const speed = this.def.speed * this.status.slowMult;
    const onGround = this.body.blocked.down;
    this.cd -= s;
    const sees = adx < 420 && Math.abs(dy) < 220 && p.state !== 'dead';
    if (sees) this.alerted = true; else if (adx > 700) this.alerted = false;

    if (this.state === 'attack' || this.state === 'cast') { // waiting for anim / tween to finish
      if (onGround && ai !== 'flyer' && this.state !== 'dash') this.body.setVelocityX(this.body.velocity.x * 0.85);
      this.attackT -= s; if (this.attackT <= 0) this.state = 'chase';
      return;
    }
    if (this.state === 'dash') { this.dashT -= s; this.contactHit(1.2); if (this.dashT <= 0 || this.body.blocked.left || this.body.blocked.right) { this.state = 'chase'; this.cd = this.def.attackCd; } return; }
    if (this.state === 'leap') { this.contactHit(1.3); if (onGround && this.body.velocity.y >= 0 && this.leapAge > 0.15) this.land(); this.leapAge += s; return; }

    if (ai === 'flyer') return this.thinkFlyer(s, dx, dy, sees);

    if (!this.alerted) { // patrol
      this.patrolTimer -= s;
      if (this.patrolTimer <= 0 || this.body.blocked.left || this.body.blocked.right || !this.groundAhead()) { this.facing *= -1; this.patrolTimer = 2 + Math.random() * 2; }
      this.body.setVelocityX(this.facing * speed * 0.45); this.playA('move'); return;
    }
    this.facing = Math.sign(dx) || this.facing;
    const range = this.def.range || 60;
    if (ai === 'charger' && adx < 300 && adx > 80 && this.cd <= 0 && onGround && Math.abs(dy) < 60) return this.startDash();
    if (ai === 'leaper' && adx < (this.def.range || 220) && this.cd <= 0 && onGround) return this.startLeap(dx);
    if (ai === 'caster' && adx > range && adx < this.def.shootRange && this.cd <= 0 && Math.abs(dy) < 160) return this.startCast(dx, dy);
    if (adx <= range && this.cd <= 0 && Math.abs(dy) < 80) return this.startMelee();
    // move
    let want = this.facing * speed;
    if (ai === 'caster' && adx < 180 && this.cd > 0) want = -this.facing * speed * 0.7; // keep distance
    if (adx < range * 0.7 && ai !== 'caster') want = 0;
    if (!this.groundAhead(Math.sign(want))) want = 0;
    this.body.setVelocityX(want);
    if (want !== 0 && (this.body.blocked.left || this.body.blocked.right) && onGround) this.body.setVelocityY(-420);
    this.playA(want === 0 ? 'idle' : 'move');
    this.contactHit(0.6);
  }

  thinkFlyer(s, dx, dy, sees) {
    const p = this.player;
    const targetX = this.alerted ? p.x - Math.sign(dx || 1) * 170 : this.x + this.facing * 40;
    const targetY = this.alerted ? Math.min(p.y - this.def.hover, this.homeY) + Math.sin(this.t * 2.2) * 18 : this.homeY + Math.sin(this.t * 2) * 12;
    this.body.setVelocity((targetX - this.x) * 1.6 * this.status.slowMult, (targetY - this.y) * 2.2);
    if (!this.alerted) { this.patrolTimer -= s; if (this.patrolTimer <= 0) { this.facing *= -1; this.patrolTimer = 2.5; } }
    else this.facing = Math.sign(dx) || 1;
    if (this.alerted && this.cd <= 0 && Math.abs(dx) < this.def.shootRange) {
      this.cd = this.def.attackCd;
      const a = Math.atan2(p.y - 40 - this.y + 30, p.x - this.x);
      this.scene.tweens.add({ targets: this, scaleX: 1.15, scaleY: 0.9, yoyo: true, duration: 120 });
      this.scene.time.delayedCall(220, () => {
        if (!this.active || this.state === 'dead') return;
        this.scene.pools.enemyShots.get()?.fire(this.x, this.y - 30, Math.cos(a) * this.def.projSpeed, Math.sin(a) * this.def.projSpeed, { type: this.def.proj, dmg: this.def.projDmg * this.levelMult, owner: this });
        Audio.play('laser');
      });
    }
  }

  groundAhead(dir = this.facing) {
    if (this.def.ai === 'flyer') return true;
    return this.scene.isSolidAt(this.x + dir * (this.def.body[0] / 2 + 10), this.y + 10);
  }

  startMelee() {
    this.state = 'attack'; this.cd = this.def.attackCd; this.hitThisAttack = false; this.body.setVelocityX(0);
    if (this.isAtlas) { this.playA('attack', true); this.attackT = 1.2; }
    else { this.attackT = 0.7; this.lunge(); }
  }
  startCast(dx, dy) {
    this.state = 'cast'; this.cd = this.def.attackCd; this.body.setVelocityX(0); this.attackT = 1.1;
    this.playA('cast', true);
    this.scene.time.delayedCall(380, () => {
      if (!this.active || this.state === 'dead' || this.status.freeze > 0) return;
      const p = this.player; const a = Math.atan2(p.y - 40 - (this.y - 40), p.x - this.x); const n = this.def.spread || 1;
      for (let i = 0; i < n; i++) {
        const aa = a + (i - (n - 1) / 2) * 0.18;
        this.scene.pools.enemyShots.get()?.fire(this.x + this.facing * 24, this.y - 44, Math.cos(aa) * this.def.projSpeed, Math.sin(aa) * this.def.projSpeed, { type: this.def.proj, dmg: this.def.projDmg * this.levelMult, owner: this });
      }
      Audio.play('shoot');
    });
  }
  startDash() {
    this.state = 'dash'; this.dashT = 0.45; this.hitThisAttack = false;
    this.playA('dash', true); this.body.setVelocityX(this.facing * this.def.dashSpeed);
    this.scene.fx.flash('glow', this.x, this.y - 30, { tint: ELEMENT[this.def.element], from: 0.3, to: 1, dur: 200 });
  }
  startLeap(dx) {
    this.state = 'leap'; this.leapAge = 0; this.hitThisAttack = false; this.cd = this.def.attackCd;
    const [vx, vy] = this.def.leap; this.body.setVelocity(Phaser.Math.Clamp(dx * 1.4, -vx, vx), -vy);
    this.playA('jump', true);
    this.scene.tweens.add({ targets: this, scaleY: 0.75, scaleX: 1.2, duration: 100, yoyo: true });
  }
  land() {
    this.state = 'chase'; this.body.setVelocityX(0);
    this.scene.fx.flash('shockwave', this.x, this.y - 8, { tint: 0xb05aff, from: 0.8, to: 2.4, dur: 300 });
    this.scene.shake(0.003, 100);
    const p = this.player; if (Math.abs(p.x - this.x) < 90 && Math.abs(p.y - this.y) < 40) p.takeDamage(this.dmg, this.x);
  }
  lunge() { // procedural attack for static designs
    const f = this.facing;
    this.scene.tweens.add({ targets: this, x: this.x + f * 26, scaleX: 1.12, duration: 160, yoyo: true, ease: 'Quad.easeOut',
      onYoyo: () => this.meleeHit() });
  }
  onAnimDone(anim) {
    if (this.state === 'dead') return;
    if (anim.key.endsWith('_' + (this.def.anims?.attack))) { this.state = 'chase'; }
    if (anim.key.endsWith('_' + (this.def.anims?.cast))) { this.state = 'chase'; }
    if (anim.key.endsWith('_hurt')) this.state = 'chase';
  }
  // called each frame during atlas attack anim
  update() {
    if (this.state === 'attack' && this.isAtlas && !this.hitThisAttack && this.anims.currentFrame && this.anims.currentFrame.index >= (this.def.attackFrame || 3)) this.meleeHit();
  }
  meleeHit() {
    if (this.hitThisAttack || this.state === 'dead') return; this.hitThisAttack = true;
    const r = this.def.range || 60, f = this.facing;
    const rect = new Phaser.Geom.Rectangle(f > 0 ? this.x - 10 : this.x - r - 10, this.y - this.def.body[1], r + 20, this.def.body[1]);
    const p = this.player;
    if (Phaser.Geom.Rectangle.Overlaps(rect, p.body ? new Phaser.Geom.Rectangle(p.body.x, p.body.y, p.body.width, p.body.height) : rect)) p.takeDamage(this.dmg, this.x);
    Audio.play('sword');
  }
  contactHit(mult) {
    const p = this.player; if (!p || p.state === 'dead' || this.hitThisAttack && mult > 1) return;
    if (this.scene.physics.overlap(this, p)) { if (p.takeDamage(this.dmg * mult, this.x) && mult > 1) this.hitThisAttack = true; }
  }

  proceduralAnim() {
    const ai = this.def.ai;
    if (this.state === 'leap' || this.state === 'attack') return;
    if (ai === 'flyer') { this.angle = Phaser.Math.Clamp(this.body.velocity.x * 0.04, -12, 12); }
    else { const moving = Math.abs(this.body.velocity.x) > 10; this.scaleY = 1 + Math.sin(this.t * (moving ? 12 : 3)) * (moving ? 0.05 : 0.025); this.scaleX = 2 - this.scaleY; }
  }

  takeDamage(amount, opts = {}) {
    if (this.state === 'dead') return 0;
    const crit = !opts.dot && Math.random() < (opts.crit || 0);
    let dmg = amount * (crit ? 1.8 : 1) * (1 - (this.def.armor || 0)) * Phaser.Math.FloatBetween(0.92, 1.08);
    dmg = Math.max(1, Math.round(dmg));
    this.hp -= dmg; this.alerted = true;
    this.scene.fx.number(this.x, this.y - this.def.body[1] - 10, dmg, opts.dot ? 0xffaa5a : (crit ? 0xffe04a : (ELEMENT[opts.element] ?? 0xffffff)), crit);
    if (!opts.dot) {
      this.setTintFill(0xffffff); this.scene.time.delayedCall(70, () => { if (this.active) { if (this.status.freeze > 0) this.setTint(0x9ae0ff); else this.clearTint(); } });
      this.scene.fx.sparks(this.x, this.y - this.def.body[1] / 2, ELEMENT[opts.element] ?? 0xffffff, 5);
      Audio.play('hit');
    }
    if (opts.burn) { this.status.burn = opts.burn; this.status.burnDps = amount * 0.25; }
    if (opts.slow) { this.status.slow = 2.5; this.status.slowMult = opts.slow; }
    if (opts.freeze) { this.status.freeze = opts.freeze; this.setTint(0x9ae0ff); }
    if (this.hp <= 0) { this.die(); return dmg; }
    if (!opts.noKb && opts.kb && this.state !== 'dash' && this.state !== 'leap') {
      this.body.setVelocity(opts.kb * (this.def.ai === 'flyer' ? 0.8 : 1), this.def.ai === 'flyer' ? -60 : -140);
      if (this.state !== 'attack' || Math.abs(opts.kb) > 200) { this.state = 'hurt'; this.hurtT = 0.25; this.playA('hurt', true); }
    }
    return dmg;
  }

  die() {
    this.state = 'dead'; this.hp = 0; this.body.setVelocity(0, this.def.ai === 'flyer' ? 0 : this.body.velocity.y);
    this.body.checkCollision.none = this.def.ai === 'flyer'; if (this.def.ai === 'flyer') this.body.setAllowGravity(true);
    this.hpBar.clear(); Audio.play('enemy_die');
    const col = ELEMENT[this.def.element] ?? 0xb05aff;
    this.scene.onEnemyKilled(this);
    if (this.isAtlas) {
      this.playA('death', true);
      this.once('animationcomplete', () => this.scene.tweens.add({ targets: this, alpha: 0, duration: 500, onComplete: () => this.cleanup() }));
    } else {
      this.scene.fx.burst(this.x, this.y - this.def.body[1] / 2, col, 1);
      this.scene.tweens.add({ targets: this, alpha: 0, scaleY: 0.2, scaleX: 1.4, duration: 350, onComplete: () => this.cleanup() });
    }
  }
  cleanup() { this.shadow.destroy(); this.hpBar.destroy(); this.destroy(); }

  drawHp() {
    const g = this.hpBar; g.clear();
    if (this.hp >= this.maxHp || this.state === 'dead') return;
    const w = 44, x = this.x - w / 2, y = this.y - this.def.body[1] - 16;
    g.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, w + 2, 6);
    g.fillStyle(0xe0405a).fillRect(x, y, w * this.hp / this.maxHp, 4);
  }
}
