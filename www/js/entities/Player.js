// Player character: movement (walk/run/jump/double jump/fall/dash), data-driven skills, damage & death.
import { CHARACTERS, SKILL_SLOTS } from '../data/characters.js';
import { GameState } from '../systems/GameState.js';
import { Audio } from '../systems/AudioManager.js';
import { DEPTH, ELEMENT } from '../config.js';

const BODY_W = 28, BODY_H = 62;
const SKILL_FX = { kai: 'fx_voidspike', mira: 'fx_eruption', ryu: 'fx_eruption', elena: 'fx_eruption' };

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, charId) {
    super(scene, x, y, charId, 'idle_0');
    scene.add.existing(this); scene.physics.add.existing(this);
    this.setDepth(DEPTH.player);
    this.body.setMaxVelocity(900, 1100);
    this.cooldowns = Object.fromEntries(SKILL_SLOTS.map(s => [s, 0]));
    this.cdMax = Object.fromEntries(SKILL_SLOTS.map(s => [s, 1]));
    this.state = 'normal'; this.facing = 1; this.jumps = 0; this.coyote = 0; this.jumpBuffer = 0;
    this.invuln = 0; this.moveTime = 0; this.combo = 0; this.comboTimer = 0; this.swapCd = 0; this.dashHit = null;
    this.ghosts = []; for (let i = 0; i < 6; i++) this.ghosts.push(scene.add.image(0, 0, charId, 'idle_0').setVisible(false).setDepth(DEPTH.player - 1).setBlendMode(Phaser.BlendModes.ADD));
    this.ghostT = 0;
    const st = GameState.getStats();
    this.hp = GameState.data.hp ?? st.maxHp; this.energy = GameState.data.energy ?? st.maxEnergy;
    this.hp = Math.min(this.hp, st.maxHp) || st.maxHp;
    this.setCharacter(charId, true);
    this.on('animationcomplete', this.onAnimComplete, this);
  }

  get stats() { return GameState.getStats(); }

  setCharacter(id, silent = false) {
    this.charId = id; this.def = CHARACTERS[id];
    const meta = this.scene.cache.json.get('sprite_meta')[id];
    this.meta = meta;
    this.setTexture(id, 'idle_0');
    this.setOrigin(meta.anchorX / meta.frameW, meta.anchorY / meta.frameH);
    this.body.setSize(BODY_W, BODY_H);
    this.body.setOffset(meta.anchorX - BODY_W / 2, meta.anchorY - BODY_H);
    for (const g of this.ghosts) g.setTexture(id, 'idle_0').setOrigin(this.originX, this.originY);
    GameState.data.active = id;
    if (!silent) {
      this.scene.fx.burst(this.x, this.y - 36, this.def.color, 1);
      Audio.play('pickup'); this.state = 'normal'; this.play(`${id}_idle`, true);
      this.scene.events.emit('player-swap', id);
    }
  }

  anim(name, ignoreIfPlaying = true) {
    const k = `${this.charId}_${name}`;
    if (this.anims.currentAnim?.key === k && ignoreIfPlaying && this.anims.isPlaying) return;
    this.play(k, ignoreIfPlaying);
  }

  update(dt, input) {
    const s = dt / 1000; const st = this.stats; const body = this.body;
    // timers
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - s);
    this.invuln = Math.max(0, this.invuln - s); this.swapCd = Math.max(0, this.swapCd - s);
    this.comboTimer -= s; if (this.comboTimer <= 0) this.combo = 0;
    if (this.state !== 'dead') this.energy = Math.min(st.maxEnergy, this.energy + st.regen * s);
    this.setAlpha(this.invuln > 0 && this.state !== 'dash' ? (Math.floor(this.invuln * 20) % 2 ? 0.35 : 1) : 1);
    this.updateGhosts(s);
    if (this.state === 'dead') { body.setVelocityX(body.velocity.x * 0.9); return; }

    const onGround = body.blocked.down || body.touching.down;
    if (onGround) { this.coyote = 0.1; this.jumps = 0; } else this.coyote -= s;
    if (input.pressed.jump) this.jumpBuffer = 0.13; else this.jumpBuffer -= s;

    if (this.state === 'dash') { this.updateDash(s); return; }
    if (this.state === 'hurt') { this.hurtT -= s; if (this.hurtT <= 0) this.state = 'normal'; return; }

    // horizontal movement
    const locked = this.state === 'attack' && onGround;
    const dir = input.x;
    if (dir !== 0 && !locked) {
      if (this.state !== 'attack') this.facing = dir;
      this.moveTime += s;
      const running = !input.walk && this.moveTime > 0.22;
      const target = dir * this.def.speed * st.speed * (running ? 1 : 0.55) * (this.slowT > 0 ? 0.6 : 1);
      body.setVelocityX(Phaser.Math.Linear(body.velocity.x, target, Math.min(1, s * (onGround ? 14 : 8))));
      this.running = running;
    } else {
      this.moveTime = 0; this.running = false;
      body.setVelocityX(Phaser.Math.Linear(body.velocity.x, 0, Math.min(1, s * (onGround ? (locked ? 10 : 16) : 3))));
    }
    this.setFlipX(this.facing < 0);

    // jumping (coyote time, buffer, double jump, variable height)
    if (this.jumpBuffer > 0 && this.state !== 'attack') {
      if (this.coyote > 0) { this.doJump(1); }
      else if (this.jumps < 2) { this.doJump(0.92, true); }
    }
    if (!input.held.jump && body.velocity.y < -200) body.setVelocityY(body.velocity.y * 0.88);
    // drop through one-way platform
    if (input.held.down && input.pressed.jump && onGround) { this.dropT = 0.25; }
    this.dropT = Math.max(0, (this.dropT || 0) - s);
    this.slowT = Math.max(0, (this.slowT || 0) - s);

    // skills
    if (input.pressed.swap) this.cycleCharacter();
    if (input.pressed.potion) this.scene.useItem('potion');
    if (input.pressed.ether) this.scene.useItem('ether');
    for (const slot of ['ult', 'skill', 'dash', 'heavy', 'attack']) {
      if (slot === 'attack' ? input.held.attack : input.pressed[slot]) { if (this.useSkill(slot)) break; }
    }

    // animation state
    if (this.state === 'normal') {
      if (!onGround) this.anim(body.velocity.y < 0 ? 'jump' : 'fall');
      else if (Math.abs(body.velocity.x) > 30) { this.anim('run'); this.anims.timeScale = this.running ? 1 : 0.6; }
      else { this.anim('idle'); this.anims.timeScale = 1; }
    }
  }

  doJump(mult, air = false) {
    this.body.setVelocityY(-this.def.jump * mult);
    this.jumps = air ? 2 : 1; this.coyote = 0; this.jumpBuffer = 0;
    Audio.play('jump');
    if (air) { this.scene.fx.flash('ring', this.x, this.y, { tint: this.def.color, from: 0.15, to: 0.6, dur: 250 }); this.anims.play(`${this.charId}_jump`, false); }
  }

  cycleCharacter() {
    if (this.swapCd > 0 || this.state !== 'normal') return;
    const order = ['kai', 'mira', 'ryu', 'elena'];
    this.setCharacter(order[(order.indexOf(this.charId) + 1) % order.length]);
    this.swapCd = 1.5;
  }

  canUse(slot) {
    const sk = this.def.skills[slot];
    if (slot === 'ult' && GameState.skillLevel(this.charId, 'ult') < 1) return false;
    return this.cooldowns[slot] <= 0 && this.energy >= sk.cost && (this.state === 'normal' || (slot === 'dash' && this.state === 'attack'));
  }

  useSkill(slot) {
    if (!this.canUse(slot)) {
      if (slot === 'ult' && GameState.skillLevel(this.charId, 'ult') < 1 && this.state === 'normal' && !this._ultWarned) { this._ultWarned = true; this.scene.toast('Unlock the Ultimate in the Skill Tree'); }
      return false;
    }
    const sk = this.def.skills[slot];
    const cd = sk.cd * GameState.skillCdMult(this.charId, slot);
    this.cooldowns[slot] = cd; this.cdMax[slot] = cd; this.energy -= sk.cost;
    const power = sk.dmg * GameState.skillMult(this.charId, slot) * this.def.baseAtk;
    Audio.play(sk.sfx);
    if (sk.kind === 'dashStrike') { this.startDash(sk, power); return true; }
    this.state = 'attack';
    let animName = sk.anim;
    this.anims.timeScale = 1;
    this.play(`${this.charId}_${animName}`);
    const animDur = (this.anims.currentAnim?.frames.length || 5) / (this.anims.currentAnim?.frameRate || 12) * 1000;
    this.attackEnd = this.scene.time.now + animDur;
    const at = Math.min(animDur * 0.45, 160);
    this.scene.time.delayedCall(sk.kind === 'melee' ? at * 0.6 : at, () => { if (this.state !== 'dead') this.execute(sk, power, slot); });
    if (sk.kind === 'melee' && sk.combo) { this.combo = (this.combo + 1) % 3; this.comboTimer = 0.6; }
    if (!this.body.blocked.down && sk.kind !== 'melee') this.body.setVelocityY(Math.min(this.body.velocity.y, -60));
    return true;
  }

  onAnimComplete(anim) {
    if (this.state === 'attack') { this.state = 'normal'; }
    if (this.state === 'dead' && anim.key.endsWith('_death')) this.scene.onPlayerDeath();
  }

  execute(sk, power, slot) {
    const sc = this.scene, f = this.facing, col = ELEMENT[sk.element];
    const cx = this.x, cy = this.y - 36;
    switch (sk.kind) {
      case 'melee': {
        const comboMult = this.combo === 0 ? 1.35 : 1; // third hit of chain is strongest
        const rect = new Phaser.Geom.Rectangle(f > 0 ? cx : cx - sk.range, cy - sk.h / 2, sk.range, sk.h);
        sc.combat.hitArea(rect, power * comboMult, { element: sk.element, kb: 160 * f, burn: sk.burn, source: this });
        sc.fx.flash('fx_arc', cx + f * sk.range * 0.55, cy, { tint: col, flipX: f < 0, from: 0.7, to: 1.1, dur: 220, rot: this.combo === 2 ? (f * 0.6) : (this.combo === 1 ? -f * 0.4 : 0) });
        break;
      }
      case 'projectile': {
        const n = sk.count || 1;
        for (let i = 0; i < n; i++) {
          sc.pools.playerShots.get()?.fire(cx + f * 30, cy - 4, f * sk.speed, (i - (n - 1) / 2) * 60,
            { type: sk.proj, dmg: power, owner: this, element: sk.element, slow: sk.slow, burn: sk.burn, explode: sk.explode });
        }
        sc.fx.flash('glow', cx + f * 30, cy, { tint: col, from: 0.2, to: 0.8, dur: 180 });
        break;
      }
      case 'nova': {
        const r = sk.radius;
        sc.combat.hitCircle(cx, cy, r, power, { element: sk.element, kb: 260, freeze: sk.freeze, burn: sk.burn, source: this });
        sc.fx.burst(cx, cy, col, r / 90);
        sc.fx.flash(SKILL_FX[this.charId], cx, this.y, { tint: this.charId === 'kai' ? null : col, origin: [0.5, 1], from: 0.6 * r / 120, to: 1.3 * r / 120, dur: 520 });
        if (sk.heal) this.heal(this.stats.maxHp * sk.heal);
        sc.shake(sk.cost >= 70 ? 0.012 : 0.006, sk.cost >= 70 ? 450 : 220);
        if (sk.cost >= 70) sc.cameras.main.flash(250, (col >> 16) & 255, (col >> 8) & 255, col & 255);
        break;
      }
      case 'beam': {
        const len = sk.length;
        const rect = new Phaser.Geom.Rectangle(f > 0 ? cx : cx - len, cy - 34, len, 68);
        sc.combat.hitArea(rect, power, { element: sk.element, kb: 300 * f, burn: sk.burn, source: this, multi: 3 });
        const b = sc.fx.flash('beam', cx + f * 10, cy, { tint: col, origin: [f > 0 ? 0 : 1, 0.5], from: 1.6, scaleX: len / 64, dur: 600 });
        b.setScale(len / 64, 2.2);
        for (let i = 0; i < 6; i++) sc.time.delayedCall(i * 60, () => sc.fx.particles(cx + f * (60 + i * len / 6), cy, col, 8, 260, 0.6));
        sc.shake(0.014, 500); sc.cameras.main.flash(200, (col >> 16) & 255, (col >> 8) & 255, col & 255);
        break;
      }
      case 'heal': {
        this.heal(this.stats.maxHp * sk.heal);
        sc.combat.hitCircle(cx, cy, sk.radius, power, { element: 'light', kb: 120, source: this });
        sc.fx.burst(cx, cy, col, 1.4);
        sc.fx.flash('fx_eruption', cx, this.y, { tint: 0xfff0a0, origin: [0.5, 1], from: 0.8, to: 1.4, dur: 600 });
        break;
      }
      case 'ground': {
        sc.combat.addZone({ x: cx + f * (sk.width / 2 + 10), y: this.y, w: sk.width, h: 26, dmg: power, element: sk.element, slow: sk.slow, duration: sk.duration, color: col });
        break;
      }
    }
  }

  startDash(sk, power) {
    this.state = 'dash'; this.dashT = 0.2; this.invuln = Math.max(this.invuln, 0.28);
    this.dashSpeed = sk.dist / 0.2; this.dashPower = power; this.dashSkill = sk; this.dashHit = new Set();
    this.body.setAllowGravity(false); this.body.setVelocity(this.facing * this.dashSpeed, 0);
    this.play(`${this.charId}_dash`);
    this.scene.fx.flash('glow', this.x, this.y - 30, { tint: ELEMENT[sk.element], from: 0.4, to: 1.4, dur: 250 });
  }
  updateDash(s) {
    this.dashT -= s; this.body.setVelocityX(this.facing * this.dashSpeed);
    this.ghostT -= s; if (this.ghostT <= 0) { this.ghostT = 0.03; this.spawnGhost(); }
    const rect = new Phaser.Geom.Rectangle(this.x - 30, this.y - 64, 60, 64);
    this.scene.combat.hitArea(rect, this.dashPower, { element: this.dashSkill.element, kb: 120 * this.facing, hitSet: this.dashHit, source: this });
    if (this.dashT <= 0 || this.body.blocked.left || this.body.blocked.right) {
      this.state = 'normal'; this.body.setAllowGravity(true); this.body.setVelocityX(this.facing * this.def.speed * 0.6);
    }
  }
  spawnGhost() {
    const g = this.ghosts.find(g => !g.visible); if (!g) return;
    g.setTexture(this.texture.key, this.frame.name).setPosition(this.x, this.y).setFlipX(this.flipX).setVisible(true).setAlpha(0.6).setTint(this.def.color);
    g.life = 0.25;
  }
  updateGhosts(s) { for (const g of this.ghosts) if (g.visible) { g.life -= s; g.setAlpha(Math.max(0, g.life / 0.25 * 0.6)); if (g.life <= 0) g.setVisible(false); } }

  heal(n) {
    const max = this.stats.maxHp; const before = this.hp; this.hp = Math.min(max, this.hp + n);
    if (this.hp > before) this.scene.fx.number(this.x, this.y - 80, '+' + Math.round(this.hp - before), 0x6aff8a);
  }
  restoreEnergy(n) { this.energy = Math.min(this.stats.maxEnergy, this.energy + n); }

  takeDamage(amount, fromX, opts = {}) {
    if (this.state === 'dead' || (this.invuln > 0 && !opts.unblockable) || this.scene.cutscene) return false;
    const dmg = Math.max(1, Math.round(amount * (1 - this.stats.def) * Phaser.Math.FloatBetween(0.9, 1.1)));
    this.hp -= dmg;
    this.scene.fx.number(this.x, this.y - 80, dmg, 0xff5a6a);
    this.scene.fx.sparks(this.x, this.y - 40, 0xff4a5a, 8);
    this.scene.shake(0.006, 160); Audio.play('hurt');
    if (opts.slow) this.slowT = opts.slow;
    if (this.hp <= 0) { this.hp = 0; this.die(); return true; }
    this.invuln = 1.0; this.state = 'hurt'; this.hurtT = 0.28; this.body.setAllowGravity(true);
    const dir = fromX !== undefined ? Math.sign(this.x - fromX) || 1 : -this.facing;
    this.body.setVelocity(dir * 240, -260);
    this.play(`${this.charId}_hurt`);
    return true;
  }

  die() {
    this.state = 'dead'; this.body.setAllowGravity(true); this.body.setVelocityY(-200);
    this.play(`${this.charId}_death`);
    GameState.data.totals.deaths++;
    this.scene.events.emit('player-dead');
  }

  respawn(x, y) {
    const st = this.stats;
    this.setPosition(x, y); this.body.reset(x, y); this.hp = st.maxHp; this.energy = st.maxEnergy;
    this.state = 'normal'; this.invuln = 2; this.setAlpha(1); this.body.setAllowGravity(true);
    for (const k in this.cooldowns) this.cooldowns[k] = 0;
    this.play(`${this.charId}_idle`);
    this.scene.fx.burst(x, y - 40, this.def.color, 1.2);
  }

  destroy(fromScene) { for (const g of this.ghosts) g.destroy(); this.ghosts = []; super.destroy(fromScene); }
}
