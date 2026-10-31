// Core gameplay scene: level construction, parallax, physics, combat resolution, progression hooks.
import { TILE, ROWS, DEPTH, GAME_W, GAME_H, ELEMENT } from '../config.js';
import { LEVELS } from '../data/levels.js';
import { ENEMIES } from '../data/enemies.js';
import { BOSSES } from '../data/bosses.js';
import { ITEMS, DROPS } from '../data/items.js';
import { buildLevel, T, SOLID } from '../systems/LevelBuilder.js';
import { GameState } from '../systems/GameState.js';
import { Audio } from '../systems/AudioManager.js';
import { InputManager } from '../systems/InputManager.js';
import { FxPool, Projectile } from '../systems/Pools.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.levelId = data.levelId || GameState.data.currentLevel || 1;
    this.levelDef = LEVELS[this.levelId - 1];
    this.lives = 3; this.cutscene = false; this.bossTriggered = false; this.boss = null; this.levelDone = false;
    this.zones = []; this.finished = false; this.handlingDeath = false; this._stopping = false;
  }

  create() {
    const lv = this.levelDef; const built = this.built = buildLevel(lv);
    const W = built.pixelWidth, H = built.pixelHeight;
    this.levelMult = 1 + (this.levelId - 1) * 0.45;
    this.cameras.main.setBackgroundColor(this.cache.json.get('manifest') ? '#0b0716' : '#000');
    this.fx = new FxPool(this);
    this.inputMgr = new InputManager(this);

    this.createBackground(lv);
    this.createTilemap(lv, built);
    this.createDecor(lv, built);

    // physics world: no floor collision so pits are deadly
    this.physics.world.setBounds(0, -400, W, H + 800);
    this.physics.world.setBoundsCollision(true, true, false, false);

    // pools
    this.pools = {
      playerShots: this.physics.add.group({ classType: Projectile, maxSize: 50, allowGravity: false, runChildUpdate: false }),
      enemyShots: this.physics.add.group({ classType: Projectile, maxSize: 90, allowGravity: false, runChildUpdate: false }),
    };
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });
    this.coins = this.physics.add.group();

    // player (resume from checkpoint if saved for this level)
    const cp = GameState.data.checkpoint && GameState.data.checkpoint.levelId === this.levelId ? GameState.data.checkpoint : null;
    const sx = cp ? cp.x : 3 * TILE, sy = cp ? cp.y - 4 : (ROWS - lv.ground) * TILE - 4;
    this.player = new Player(this, sx, sy, GameState.data.active || 'kai');
    this.respawnPoint = { x: sx, y: sy }; this.lastSafe = { x: sx, y: sy };

    // entities
    for (const e of built.enemies) this.spawnEnemy(e.type, e.x, e.y);
    this.createPickups(built);
    this.createCheckpoints(built, cp);

    // collisions
    this.physics.add.collider(this.player, this.layer, null, (pl, tile) => !(tile.index === T.PLAT && (pl.dropT > 0 || pl.body.velocity.y < 0)), this);
    this.physics.add.collider(this.enemies, this.layer);
    this.physics.add.collider(this.coins, this.layer);
    this.physics.add.collider(this.pools.playerShots, this.layer, s => { if (s.cfg && !s.cfg.gravity) s.kill(true); else s.kill(true); }, (s, tile) => tile.index !== T.PLAT);
    this.physics.add.collider(this.pools.enemyShots, this.layer, s => s.kill(true), (s, tile) => tile.index !== T.PLAT && s.opts?.type !== 'shock');
    this.physics.add.overlap(this.pools.playerShots, this.enemies, (s, e) => this.projectileHit(s, e));
    this.physics.add.overlap(this.pools.enemyShots, this.player, (pl, s) => this.enemyProjectileHit(s));
    this.physics.add.overlap(this.player, this.pickups, (pl, it) => this.collect(it));
    this.physics.add.overlap(this.player, this.coins, (pl, c) => this.collectCoin(c));

    // camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H); cam.startFollow(this.player, true, 0.12, 0.12, 0, 40); cam.setDeadzone(80, 60);
    cam.setRoundPixels(true);

    this.combat = this.makeCombat();
    // UI overlay
    this.scene.launch('UI', { levelId: this.levelId });
    this.ui = this.scene.get('UI');
    this.input.keyboard?.on('keydown-ESC', () => this.pause());
    this.input.keyboard?.on('keydown-P', () => this.pause());
    this.input.keyboard?.on('keydown-TAB', (e) => { e.preventDefault?.(); this.pause('Inventory'); });
    this.onBack = () => this.pause(); this.game.events.on('android-back', this.onBack);
    this.onHidden = () => this.pause(); this.game.events.on('app-hidden', this.onHidden);
    this.events.once('shutdown', () => this.cleanup());
    this.unsub = GameState.on((type, p) => {
      if (type === 'levelup') this.onLevelUp(p);
      if (type === 'mission') this.toast(`Side mission complete: ${p}`, '#ffd26a');
    });

    Audio.init(this); Audio.music(lv.music);
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.levelIntro(cp);
    this.saveTimer = 0;
  }

  // ---------------------------------------------------------------- construction
  createBackground(lv) {
    const meta = this.cache.json.get('bg_meta') || {};
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05030a).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky);
    this.bgFar = this.add.tileSprite(0, 0, GAME_W, GAME_H, `bg_${lv.key}_far`).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.far);
    if (lv.key === 'void') {
      this.vortex = this.add.image(GAME_W * 0.62, GAME_H * 0.36, 'bg_void_vortex').setScrollFactor(0).setDepth(DEPTH.vortex).setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: this.vortex, angle: 360, duration: 40000, repeat: -1 });
    }
    const midY = lv.key === 'academy' ? 60 : 0;
    this.bgMid = this.add.tileSprite(0, midY, GAME_W, GAME_H, `bg_${lv.key}_mid`).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.mid);
    // ambient particles per area
    const amb = { academy: [0xffd27a, -10], forest: [0x9aff8a, -15], lab: [0x6ad8ff, -25], city: [0xff8a3a, -40], void: [0xc06aff, -30] }[lv.key];
    this.add.particles(0, 0, 'px', {
      x: { min: 0, max: GAME_W }, y: { min: 0, max: GAME_H }, speedY: { min: amb[1] - 10, max: amb[1] + 10 }, speedX: { min: -10, max: 10 },
      lifespan: 4000, scale: { min: 0.4, max: 1.1 }, alpha: { start: 0, end: 0.8, ease: 'Sine.easeInOut' }, tint: amb[0], frequency: 140, blendMode: 'ADD',
    }).setScrollFactor(0).setDepth(DEPTH.mid + 1);
  }

  createTilemap(lv, built) {
    const map = this.map = this.make.tilemap({ data: built.data, tileWidth: TILE, tileHeight: TILE });
    const ts = map.addTilesetImage('tiles_' + lv.key, 'tiles_' + lv.key, TILE, TILE, 0, 0);
    this.layer = map.createLayer(0, ts, 0, 0).setDepth(DEPTH.tiles);
    this.layer.setCollision(SOLID);
    this.layer.forEachTile(t => { if (t.index === T.PLAT) { t.setCollision(false, false, true, false); } });
  }

  createDecor(lv, built) {
    const rnd = new Phaser.Math.RandomDataGenerator([String(lv.id)]);
    for (const p of built.props) {
      const key = 'prop_' + p.key; if (!this.textures.exists(key)) continue;
      const img = this.add.image(p.x, p.y, key).setOrigin(0.5, 1).setDepth(DEPTH.props);
      if (p.key === 'fire') this.tweens.add({ targets: img, scaleY: 1.15, scaleX: 0.92, yoyo: true, repeat: -1, duration: 220 });
      if (p.key === 'lamp' || p.key === 'fire' || p.key === 'crystal' || p.key === 'tank') {
        const glow = this.add.image(p.x, p.y - img.height * 0.7, 'glow').setTint(ELEMENT[{ lamp: 'light', fire: 'fire', crystal: 'void', tank: 'ice' }[p.key]]).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45).setScale(1.6).setDepth(DEPTH.props - 1);
        this.tweens.add({ targets: glow, alpha: 0.25, yoyo: true, repeat: -1, duration: 900 + rnd.between(0, 600) });
      }
    }
    // extra scattered environmental props on solid ground
    const ground = built.groundAt;
    const scatter = { academy: ['lamp', 'banner'], forest: ['mushroom', 'bush'], lab: ['console', 'crate'], city: ['crate', 'fire'], void: ['crystal'] }[lv.key];
    for (let c = 8; c < built.width - 34; c += rnd.between(7, 13)) {
      if (ground[c] === undefined || ground[c + 1] !== ground[c]) continue;
      const key = 'prop_' + rnd.pick(scatter);
      this.add.image(c * TILE + 16, ground[c] * TILE, key).setOrigin(0.5, 1).setDepth(DEPTH.props - 2).setAlpha(0.95);
    }
    // foreground parallax silhouettes (scroll faster than the camera)
    this.foreground = [];
    for (let x = 300; x < built.pixelWidth * 1.3; x += rnd.between(500, 900)) {
      const key = 'prop_' + rnd.pick(lv.foreground);
      const img = this.add.image(x, 0, key).setOrigin(0.5, 1).setScrollFactor(1.35, 1).setDepth(DEPTH.foreground).setScale(2.4).setTint(0x140a20).setAlpha(0.85);
      if (key === 'prop_banner') { img.setOrigin(0.5, 0).setScale(3).setScrollFactor(1.35, 0); img.y = -6; img.setTint(0x2a1640); }
      else img.y = built.pixelHeight + img.displayHeight * 0.45; // only the top part peeks in from the bottom edge
      this.foreground.push(img);
    }
  }

  createPickups(built) {
    for (const p of built.pickups) {
      const tex = { hp: 'prop_orb_hp', mp: 'prop_orb_mp', coin: 'prop_coin', chest: 'prop_chest' }[p.type];
      const it = this.pickups.create(p.x, p.y - (p.type === 'chest' ? 12 : 34), tex);
      it.ptype = p.type; it.setDepth(DEPTH.pickups);
      if (p.type === 'chest') it.setScale(1.6);
      else this.tweens.add({ targets: it, y: it.y - 8, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
      it.body.setSize(it.width, it.height);
    }
  }

  createCheckpoints(built, cp) {
    this.checkpoints = built.checkpoints.map(c => {
      const active = cp && Math.abs(cp.x - c.x) < 4;
      const s = this.add.image(c.x, c.y, active ? 'prop_checkpoint' : 'prop_checkpoint_off').setOrigin(0.5, 1).setDepth(DEPTH.props);
      return { ...c, sprite: s, active };
    });
  }

  spawnEnemy(type, x, y) {
    if (!ENEMIES[type]) return null;
    const e = new Enemy(this, x, y, type, this.levelMult);
    this.enemies.add(e);
    if (ENEMIES[type].ai === 'flyer') e.body.setAllowGravity(false);
    return e;
  }

  levelIntro(cp) {
    const lv = this.levelDef;
    this.cutscene = true;
    this.time.delayedCall(cp ? 300 : 1400, () => { this.cutscene = false; });
    this.ui.events.emit('banner', { title: lv.name, sub: cp ? 'Checkpoint restored' : lv.subtitle });
  }

  // ---------------------------------------------------------------- combat
  makeCombat() {
    const sc = this;
    const stats = () => GameState.getStats();
    const deal = (target, base, opts) => {
      const st = stats(); const dmg = base * st.atk;
      const o = Object.assign({ crit: st.crit }, opts);
      if (o.kb && target.x !== undefined && opts.source) o.kb = Math.sign(target.x - opts.source.x || o.kb) * Math.abs(o.kb);
      const dealt = target.takeDamage(dmg, o);
      if (dealt && opts.source === sc.player) sc.hitStop(o.multi ? 40 : 25);
      return dealt;
    };
    const targets = () => { const arr = sc.enemies.getChildren().filter(e => e.active && e.state !== 'dead'); if (sc.boss && sc.boss.active && !sc.boss.dead) arr.push(sc.boss); return arr; };
    return {
      hitArea(rect, base, opts = {}) {
        let n = 0;
        for (const e of targets()) {
          if (opts.hitSet && opts.hitSet.has(e)) continue;
          const b = e.body; if (!b) continue;
          if (Phaser.Geom.Rectangle.Overlaps(rect, new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height))) {
            opts.hitSet?.add(e); deal(e, base, opts); n++;
            if (opts.multi) for (let i = 1; i < opts.multi; i++) sc.time.delayedCall(i * 110, () => e.active && deal(e, base * 0.35, { ...opts, kb: 0 }));
          }
        }
        return n;
      },
      hitCircle(x, y, r, base, opts = {}) {
        let n = 0;
        for (const e of targets()) {
          const b = e.body; if (!b) continue;
          const cx = Phaser.Math.Clamp(x, b.x, b.x + b.width), cy = Phaser.Math.Clamp(y, b.y, b.y + b.height);
          if (Phaser.Math.Distance.Between(x, y, cx, cy) <= r) { deal(e, base, { ...opts, kb: (opts.kb || 0) * Math.sign(e.x - x || 1) }); n++; }
        }
        return n;
      },
      deal,
      addZone(z) {
        const rect = sc.add.rectangle(z.x, z.y - z.h / 2, z.w, z.h, z.color, 0.35).setDepth(DEPTH.fx - 2).setBlendMode(Phaser.BlendModes.ADD);
        const edge = sc.add.rectangle(z.x, z.y - 2, z.w, 4, 0xffffff, 0.8).setDepth(DEPTH.fx - 2);
        sc.zones.push({ ...z, t: z.duration, tick: 0, rect, edge });
        sc.fx.particles(z.x, z.y - 10, z.color, 16, 200, 0.6);
      },
    };
  }

  projectileHit(s, e) {
    if (!s.active || e.state === 'dead' || s.hitSet.has(e)) return;
    s.hitSet.add(e);
    this.combat.deal(e, s.dmg, { element: s.element, kb: 120 * Math.sign(s.body.velocity.x || 1), slow: s.opts.slow, burn: s.opts.burn, source: this.player });
    if (s.opts.explode) this.combat.hitCircle(s.x, s.y, s.opts.explode, s.dmg * 0.5, { element: s.element, burn: s.opts.burn, source: this.player });
    if (!s.cfg.pierce) s.kill(true);
  }
  enemyProjectileHit(s) {
    if (!s.active || this.player.state === 'dead') return;
    if (this.player.takeDamage(s.dmg, s.x)) { if (!s.cfg.pierce) s.kill(true); }
  }
  hitStop(ms) {
    if (this._stopping) return; this._stopping = true;
    this.physics.world.timeScale = 6; this.anims.globalTimeScale = 0.15;
    setTimeout(() => { if (this.physics?.world) this.physics.world.timeScale = 1; this.anims.globalTimeScale = 1; this._stopping = false; }, ms);
  }
  shake(i = 0.005, d = 150) { if (GameState.settings.shake) this.cameras.main.shake(d, i); }

  // ---------------------------------------------------------------- world queries
  isSolidAt(x, y) {
    const t = this.layer.getTileAtWorldXY(x, y, true);
    return !!t && (SOLID.includes(t.index) || t.index === T.PLAT);
  }
  groundBelow(x, y) {
    const tx = Math.floor(x / TILE); let ty = Math.max(0, Math.floor(y / TILE));
    for (; ty < ROWS; ty++) { const t = this.layer.getTileAt(tx, ty); if (t && (SOLID.includes(t.index) || t.index === T.PLAT)) return ty * TILE; }
    return ROWS * TILE + 200;
  }

  // ---------------------------------------------------------------- pickups & progression
  collect(it) {
    if (!it.active) return; const p = this.player;
    switch (it.ptype) {
      case 'hp': p.heal(GameState.getStats().maxHp * 0.3); Audio.play('pickup'); break;
      case 'mp': p.restoreEnergy(GameState.getStats().maxEnergy * 0.5); Audio.play('pickup'); break;
      case 'coin': GameState.addGold(10); Audio.play('coin'); this.fx.number(it.x, it.y - 20, '+10G', 0xffd23a); break;
      case 'chest': {
        Audio.play('levelup'); GameState.trackChest(this.levelId);
        const gold = 30 + this.levelId * 20; GameState.addGold(gold);
        const pool = ['potion', 'ether', 'potion', 'elixir']; const item = Phaser.Utils.Array.GetRandom(pool); GameState.addItem(item);
        this.toast(`Cache found! +${gold}G, ${ITEMS[item].name}`, '#ffd26a');
        this.fx.burst(it.x, it.y, 0xffd26a, 1.2);
        break;
      }
    }
    this.fx.sparks(it.x, it.y, 0xffffff, 6);
    it.destroy();
  }
  collectCoin(c) { if (!c.active || c.age < 0.25) return; GameState.addGold(c.value); Audio.play('coin'); c.destroy(); }
  dropCoins(x, y, total) {
    const n = Math.min(6, Math.ceil(total / 3));
    for (let i = 0; i < n; i++) {
      const c = this.coins.create(x, y - 30, 'prop_coin'); c.value = Math.ceil(total / n); c.age = 0; c.setDepth(DEPTH.pickups);
      c.body.setVelocity(Phaser.Math.Between(-140, 140), Phaser.Math.Between(-380, -220)); c.body.setBounce(0.4); c.body.setDrag(60, 0);
    }
  }

  onEnemyKilled(e) {
    const def = e.def; const xp = Math.round(def.xp * this.levelMult);
    GameState.trackKill(this.levelId);
    GameState.addXp(xp);
    this.fx.number(e.x, e.y - def.body[1] - 30, `+${xp} XP`, 0xc89aff);
    this.dropCoins(e.x, e.y, Math.round(def.gold * this.levelMult));
    for (const d of DROPS) if (Math.random() < d.chance) {
      const it = this.pickups.create(e.x, e.y - 30, d.id === 'potion' ? 'prop_orb_hp' : 'prop_orb_mp'); it.ptype = d.id === 'potion' ? 'hp' : 'mp'; it.setDepth(DEPTH.pickups);
    }
    this.events.emit('kill');
  }

  onLevelUp(level) {
    const p = this.player; const st = GameState.getStats();
    p.hp = st.maxHp; p.energy = st.maxEnergy;
    Audio.play('levelup');
    this.fx.burst(p.x, p.y - 40, 0xffd26a, 1.6);
    this.fx.flash('ring', p.x, p.y - 40, { tint: 0xffd26a, from: 0.2, to: 3, dur: 700 });
    this.ui.events.emit('levelup', level);
  }

  useItem(id) {
    const it = ITEMS[id]; const p = this.player;
    if (!it || p.state === 'dead' || !GameState.consume(id)) { this.toast(`No ${it?.name || id} left`); return false; }
    const st = GameState.getStats();
    if (it.heal) p.heal(st.maxHp * it.heal);
    if (it.energy) p.restoreEnergy(st.maxEnergy * it.energy);
    Audio.play('heal'); this.fx.burst(p.x, p.y - 40, it.heal ? 0x6aff8a : 0x6ac8ff, 0.8);
    return true;
  }

  toast(msg, color) { this.ui?.events.emit('toast', { msg, color }); }

  // ---------------------------------------------------------------- death / respawn
  onPlayerDeath() {
    if (this.handlingDeath) return; this.handlingDeath = true;
    this.lives--;
    this.ui.events.emit('lives', this.lives);
    if (this.lives > 0) {
      this.time.delayedCall(700, () => {
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.clearEnemyShots(); this.player.respawn(this.respawnPoint.x, this.respawnPoint.y);
          this.cameras.main.fadeIn(400); this.handlingDeath = false; this.toast(`Lives left: ${this.lives}`);
          if (this.boss && !this.boss.dead) { this.boss.hp = Math.min(this.boss.maxHp, this.boss.hp + this.boss.maxHp * 0.15); this.events.emit('boss-hp', this.boss.hp / this.boss.maxHp); }
        });
        this.cameras.main.fade(300, 0, 0, 0, true);
      });
    } else {
      this.time.delayedCall(900, () => {
        Audio.stopMusic(); GameState.data.hp = null; GameState.data.energy = null; GameState.save();
        this.scene.stop('UI'); this.scene.start('GameOver', { levelId: this.levelId });
      });
    }
  }
  clearEnemyShots() { this.pools.enemyShots.getChildren().forEach(s => s.active && s.kill()); }

  pitFall() {
    const p = this.player; if (p.state === 'dead') return;
    p.state = 'normal'; p.invuln = 0;
    const dmg = Math.round(GameState.getStats().maxHp * 0.2);
    p.hp -= dmg; this.fx.number(p.x, this.built.pixelHeight - 40, dmg, 0xff5a6a); Audio.play('hurt');
    if (p.hp <= 0) { p.hp = 0; p.setPosition(this.lastSafe.x, this.lastSafe.y); p.body.reset(this.lastSafe.x, this.lastSafe.y); p.die(); return; }
    p.setPosition(this.lastSafe.x, this.lastSafe.y - 10); p.body.reset(this.lastSafe.x, this.lastSafe.y - 10); p.invuln = 1.2;
    this.fx.burst(p.x, p.y - 40, p.def.color, 0.8);
  }

  // ---------------------------------------------------------------- boss
  triggerBoss() {
    const a = this.built.arena; this.bossTriggered = true;
    // close the arena behind the player
    for (let r = 0; r < ROWS - this.levelDef.ground; r++) this.layer.putTileAt(T.BLOCK, a.gateCol - 1, r).setCollision(true);
    const cam = this.cameras.main; cam.setBounds(a.x0 - TILE, 0, a.x1 - a.x0 + TILE * 3, this.built.pixelHeight);
    this.cutscene = true; this.player.body.setVelocityX(0);
    Audio.stopMusic();
    const def = BOSSES[a.key];
    const boss = this.boss = new Boss(this, a.x1 - 220, def.flying ? a.floor - 140 : a.floor - 300, a.key, a);
    this.physics.add.collider(boss, this.layer);
    this.physics.add.overlap(this.pools.playerShots, boss, (b, s) => this.projectileHit(s, b));
    boss.setAlpha(0); this.tweens.add({ targets: boss, alpha: 1, duration: 800 });
    this.shake(0.01, 800); Audio.play('boss_roar');
    this.ui.events.emit('boss', { name: def.name, sub: this.levelDef.mission.main });
    this.time.delayedCall(2200, () => { this.cutscene = false; boss.start(); Audio.music(def.music); });
  }

  onBossDefeated(key) {
    const def = BOSSES[key]; this.levelDone = true;
    GameState.addXp(def.xp); GameState.addGold(def.gold); GameState.data.totals.bosses++;
    if (def.drop) GameState.addItem(def.drop);
    const st = GameState.getStats(); GameState.data.hp = null; GameState.data.energy = null;
    GameState.completeLevel(this.levelId);
    this.ui.events.emit('boss-dead');
    Audio.music('victory');
    // portal to finish
    const a = this.built.arena;
    const portal = this.add.image((a.x0 + a.x1) / 2, a.floor, 'prop_portal').setOrigin(0.5, 1).setScale(2).setDepth(DEPTH.props).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: portal, alpha: 0.6, yoyo: true, repeat: -1, duration: 500 });
    this.toast(`${def.name} defeated! +${def.xp} XP, +${def.gold}G${def.drop ? ', ' + ITEMS[def.drop].name : ''}`, '#ffd26a');
    this.time.delayedCall(2600, () => this.finishLevel(def));
  }

  finishLevel(def) {
    if (this.finished) return; this.finished = true;
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('UI');
      this.scene.start('Victory', { levelId: this.levelId, boss: def.name, drop: def.drop, xp: def.xp, gold: def.gold });
    });
    this.cameras.main.fade(600, 0, 0, 0, true);
  }

  // ---------------------------------------------------------------- pause & cleanup
  pause(open) {
    if (this.levelDone || this.scene.isPaused()) return;
    GameState.data.hp = this.player.hp; GameState.data.energy = this.player.energy;
    this.inputMgr.reset();
    this.scene.pause(); this.scene.pause('UI');
    this.scene.launch('Pause', { open });
  }
  cleanup() {
    this.game.events.off('android-back', this.onBack); this.game.events.off('app-hidden', this.onHidden);
    this.unsub && this.unsub();
    if (this.physics?.world) this.physics.world.timeScale = 1;
    this.anims.globalTimeScale = 1;
  }

  // ---------------------------------------------------------------- main loop
  update(time, delta) {
    const dt = Math.min(delta, 50); const p = this.player;
    const input = this.inputMgr.update();
    if (this.cutscene) { input.x = 0; for (const k in input.pressed) input.pressed[k] = false; for (const k in input.held) input.held[k] = false; }
    p.update(dt, input);

    // parallax
    const cam = this.cameras.main;
    this.bgFar.tilePositionX = cam.scrollX * 0.12; this.bgFar.tilePositionY = 0;
    this.bgMid.tilePositionX = cam.scrollX * 0.35;
    this.bgMid.y = (this.levelDef.key === 'academy' ? 60 : 0) - cam.scrollY * 0.2;

    // safe ground & pits
    if (p.body.blocked.down && p.state !== 'dead') {
      const ahead = this.isSolidAt(p.x - 20, p.y + 8) && this.isSolidAt(p.x + 20, p.y + 8);
      if (ahead) { this.lastSafe.x = p.x; this.lastSafe.y = p.y; }
    }
    if (p.y > this.built.pixelHeight + 60) this.pitFall();
    // spikes
    const tUnder = this.layer.getTileAtWorldXY(p.x, p.y - 6, true);
    if (tUnder && tUnder.index === T.SPIKE && p.state !== 'dead') { if (p.takeDamage(GameState.getStats().maxHp * 0.15, p.x + (p.facing > 0 ? 40 : -40))) p.body.setVelocityY(-520); }

    // checkpoints
    for (const c of this.checkpoints) {
      if (!c.active && Math.abs(p.x - c.x) < 30 && Math.abs(p.y - c.y) < 80) {
        c.active = true; c.sprite.setTexture('prop_checkpoint'); this.respawnPoint = { x: c.x, y: c.y - 4 };
        GameState.data.checkpoint = { levelId: this.levelId, x: c.x, y: c.y };
        GameState.data.hp = p.hp; GameState.data.energy = p.energy; GameState.save();
        p.heal(GameState.getStats().maxHp * 0.3); Audio.play('checkpoint');
        this.fx.burst(c.x, c.y - 30, 0xff5aa0, 1.2); this.toast('Checkpoint reached — progress saved');
      }
    }
    // coins: age + magnet
    for (const c of this.coins.getChildren()) {
      c.age += dt / 1000;
      if (c.age > 0.5 && Phaser.Math.Distance.Between(c.x, c.y, p.x, p.y - 30) < 140) { c.body.setAllowGravity(false); this.physics.moveToObject(c, { x: p.x, y: p.y - 30 }, 520); }
    }
    // zones (frozen ground etc.)
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]; z.t -= dt / 1000; z.tick -= dt / 1000;
      if (z.tick <= 0) {
        z.tick = 0.5; const r = new Phaser.Geom.Rectangle(z.x - z.w / 2, z.y - 60, z.w, 64);
        this.combat.hitArea(r, z.dmg, { element: z.element, slow: z.slow, source: p });
        this.fx.particles(z.x + Phaser.Math.Between(-z.w / 2, z.w / 2), z.y - 8, z.color, 3, 60, 0.5);
      }
      z.rect.setAlpha(0.35 * Math.min(1, z.t)); z.edge.setAlpha(0.8 * Math.min(1, z.t));
      if (z.t <= 0) { z.rect.destroy(); z.edge.destroy(); this.zones.splice(i, 1); }
    }
    // enemy culling: only simulate enemies near the camera
    const left = cam.scrollX - 300, right = cam.scrollX + GAME_W + 300;
    for (const e of this.enemies.getChildren()) {
      const near = e.x > left && e.x < right;
      if (e.active && e.body && e.state !== 'dead') { e.body.enable = near; e.active = true; e.setVisible(near || e.visible); }
    }
    // boss trigger
    const a = this.built.arena;
    if (a && !this.bossTriggered && p.x > a.x0 + 160) this.triggerBoss();

    // keep HP for save
    this.saveTimer += dt; if (this.saveTimer > 1000) { this.saveTimer = 0; GameState.data.totals.playTime += 1; }
  }
}
