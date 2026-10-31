// HUD overlay + multi-touch Android controls (virtual joystick / d-pad + action buttons).
import { GameState } from '../systems/GameState.js';
import { LEVELS } from '../data/levels.js';
import { CHARACTERS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { text, bar } from '../ui/widgets.js';
import { Audio } from '../systems/AudioManager.js';
import { COLORS } from '../config.js';

const BTN_DEFS = [
  // key, dx, dy from bottom-right, radius, label, color
  ['attack', -110, -100, 54, 'ATK', 0xff4a6a],
  ['jump', -230, -62, 44, 'JUMP', 0x8affc8],
  ['heavy', -200, -170, 38, 'HVY', 0xb06aff],
  ['dash', -60, -215, 38, 'DASH', 0x6ac8ff],
  ['skill', -150, -265, 36, 'SKL', 0xffd26a],
  ['ult', -270, -230, 34, 'ULT', 0xff8a2a],
];

export class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }
  init(data) { this.levelId = data.levelId; }

  create() {
    const { width: W, height: H } = this.scale;
    this.game_ = this.scene.get('Game');
    const lv = LEVELS[this.levelId - 1];

    // ---- player panel
    const g = this.add.graphics();
    g.fillStyle(0x0b0716, 0.72).fillRoundedRect(8, 8, 330, 92, 12).lineStyle(2, 0x8a5ad6, 0.9).strokeRoundedRect(8, 8, 330, 92, 12);
    g.fillStyle(0x1a1030, 1).fillRoundedRect(16, 16, 76, 76, 10).lineStyle(2, 0xd8b8ff, 0.7).strokeRoundedRect(16, 16, 76, 76, 10);
    this.portrait = this.add.image(54, 54, 'face_kai');
    const mask = this.make.graphics({ add: false }).fillRoundedRect(17, 17, 74, 74, 9); this.portrait.setMask(mask.createGeometryMask());
    this.lvlText = text(this, 100, 14, '', 17, '#ffd26a');
    this.nameText = text(this, 170, 14, '', 15, '#efe6ff');
    this.hpBar = bar(this, 100, 40, 226, 14, COLORS.hp, { ticks: 10 });
    this.hpText = text(this, 213, 40, '', 11, '#ffffff', { ox: 0.5, strokeThickness: 3 });
    this.enBar = bar(this, 100, 60, 226, 10, COLORS.energy);
    this.xpBar = bar(this, 100, 77, 226, 5, COLORS.xp);
    this.goldText = text(this, 100, 86, '', 12, '#ffd26a', { strokeThickness: 3 });
    this.livesText = text(this, 330, 86, '', 12, '#ff8aa0', { ox: 1, strokeThickness: 3 });

    // ---- mission tracker
    this.mission = text(this, W / 2, 12, '', 14, '#e8dcff', { ox: 0.5, strokeThickness: 3 });
    this.missionMain = lv.mission.main; this.side = lv.mission.side;

    // ---- boss bar
    this.bossCont = this.add.container(0, 0).setVisible(false);
    const bg = this.add.graphics().fillStyle(0x0b0716, 0.8).fillRoundedRect(W / 2 - 260, 104, 520, 40, 10).lineStyle(2, 0xd02a4a).strokeRoundedRect(W / 2 - 260, 104, 520, 40, 10);
    this.bossName = text(this, W / 2, 106, '', 15, '#ffb0c0', { ox: 0.5, strokeThickness: 3 });
    this.bossBar = bar(this, W / 2 - 245, 126, 490, 10, COLORS.boss, { ticks: 4 });
    this.bossCont.add([bg, this.bossName, this.bossBar.g]);

    // ---- pause / items buttons (top right)
    this.makeTopButton(W - 36, 36, '❚❚', () => this.game_.pause());
    this.makeTopButton(W - 96, 36, '⚗', () => this.game_.useItem('potion'), 'potion');
    this.makeTopButton(W - 156, 36, '✦', () => this.game_.useItem('ether'), 'ether');
    this.makeTopButton(W - 216, 36, '⇄', () => { this.game_.inputMgr.touch.swap = true; this.time.delayedCall(80, () => (this.game_.inputMgr.touch.swap = false)); });

    // ---- touch controls
    const S = GameState.settings;
    this.touchOn = S.touch === 'on' || (S.touch === 'auto' && this.sys.game.device.input.touch);
    this.buttons = BTN_DEFS.map(([key, dx, dy, r, label, color]) => this.makeActionButton(key, W + dx, H + dy, r, label, color));
    this.createMovePad(S.joystick);
    this.pointerMap = new Map();
    this.input.addPointer(3);
    this.input.on('pointerdown', p => this.onPointer(p, 'down'));
    this.input.on('pointermove', p => this.onPointer(p, 'move'));
    this.input.on('pointerup', p => this.onPointer(p, 'up'));
    this.input.on('pointerupoutside', p => this.onPointer(p, 'up'));
    if (!this.touchOn) this.layoutDesktop();

    // ---- toasts & banners
    this.toastY = 160;
    this.events.on('toast', ({ msg, color }) => this.toast(msg, color));
    this.events.on('banner', ({ title, sub }) => this.banner(title, sub));
    this.events.on('boss', ({ name, sub }) => { this.banner(name, sub, '#ff6a8a'); this.bossCont.setVisible(true); this.bossName.setText(name); this.bossBar.set(1); });
    this.events.on('boss-dead', () => this.time.delayedCall(800, () => this.bossCont.setVisible(false)));
    this.events.on('levelup', lvl => this.banner(`LEVEL UP!  Lv.${lvl}`, '+1 Skill Point • HP & Energy restored', '#ffd26a', 1600));
    this.events.on('lives', () => {});
    this.onBossHp = r => this.bossBar.set(r);
    this.game_.events.on('boss-hp', this.onBossHp);
    this.events.once('shutdown', () => {
      this.game_.events.off('boss-hp', this.onBossHp);
      for (const e of ['toast', 'banner', 'boss', 'boss-dead', 'levelup', 'lives']) this.events.off(e);
      this.input.removeAllListeners();
    });
  }

  makeTopButton(x, y, label, cb, itemId) {
    const b = this.add.image(x, y, 'btn').setScale(0.48).setInteractive({ useHandCursor: true });
    const t = text(this, x, y, label, 18, '#ffffff', { ox: 0.5, oy: 0.5 });
    if (itemId) { b.countText = text(this, x + 16, y + 12, '', 11, '#ffd26a', { ox: 0.5, oy: 0.5, strokeThickness: 3 }); b.itemId = itemId; this.itemBtns = (this.itemBtns || []).concat(b); }
    b.on('pointerdown', (p, lx, ly, ev) => { ev?.stopPropagation(); b.setScale(0.42); Audio.unlock(); });
    b.on('pointerup', () => { b.setScale(0.48); cb(); });
    b.on('pointerout', () => b.setScale(0.48));
    b.isTopButton = true;
    return b;
  }

  makeActionButton(key, x, y, r, label, color) {
    const img = this.add.image(x, y, 'btn').setScale(r * 2 / 96);
    const ring = this.add.graphics();
    const t = text(this, x, y, label, Math.round(r * 0.36), '#' + color.toString(16).padStart(6, '0'), { ox: 0.5, oy: 0.5, strokeThickness: 3 });
    const keyHint = text(this, x, y + r * 0.5, '', 10, '#d8c8ff', { ox: 0.5, oy: 0.5, strokeThickness: 2 });
    return { key, x, y, r, img, ring, t, keyHint, color, baseScale: r * 2 / 96, down: false };
  }

  createMovePad(mode) {
    const H = this.scale.height;
    this.padMode = mode;
    this.stick = { baseX: 130, baseY: H - 120, x: 0, y: 0, pointer: null };
    this.stickBase = this.add.image(130, H - 120, 'stick_base').setAlpha(0.8);
    this.stickKnob = this.add.image(130, H - 120, 'stick_knob');
    this.dpad = [
      { key: 'left', x: 70, y: H - 90, r: 46, label: '◀' }, { key: 'right', x: 190, y: H - 90, r: 46, label: '▶' }, { key: 'down', x: 130, y: H - 40, r: 30, label: '▼' },
    ].map(d => ({ ...d, img: this.add.image(d.x, d.y, 'btn').setScale(d.r * 2 / 96), t: text(this, d.x, d.y, d.label, 24, '#ffffff', { ox: 0.5, oy: 0.5 }) }));
    const stickVis = this.touchOn && mode === 'stick', padVis = this.touchOn && mode !== 'stick';
    this.stickBase.setVisible(stickVis); this.stickKnob.setVisible(stickVis);
    for (const d of this.dpad) { d.img.setVisible(padVis); d.t.setVisible(padVis); }
  }

  layoutDesktop() {
    // keyboard players: compact read-only skill bar bottom-right with key hints
    const { width: W, height: H } = this.scale;
    const hints = { attack: 'J', jump: 'SPC', heavy: 'K', dash: 'L', skill: 'I', ult: 'O' };
    this.buttons.forEach((b, i) => {
      const x = W - 330 + i * 58, y = H - 40;
      b.x = x; b.y = y; b.r = 24; b.baseScale = 48 / 96;
      b.img.setPosition(x, y).setScale(b.baseScale); b.t.setPosition(x, y - 4).setFontSize(11); b.keyHint.setPosition(x, y + 13).setText(hints[b.key]);
    });
  }

  onPointer(p, type) {
    if (!this.touchOn) return;
    const touch = this.game_.inputMgr.touch; const W = this.scale.width;
    if (type === 'down') {
      Audio.unlock();
      for (const b of this.buttons) if (Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) < b.r * 1.15) { this.pointerMap.set(p.id, b.key); touch[b.key] = true; b.down = true; return; }
      if (this.padMode !== 'stick') {
        for (const d of this.dpad) if (Phaser.Math.Distance.Between(p.x, p.y, d.x, d.y) < d.r * 1.2) { this.pointerMap.set(p.id, 'pad_' + d.key); this.applyDpad(d.key, true); return; }
      } else if (p.x < W * 0.45 && p.y > 110) {
        this.stick.pointer = p.id; this.stick.baseX = p.x; this.stick.baseY = p.y; this.pointerMap.set(p.id, 'stick');
        this.stickBase.setPosition(p.x, p.y); this.stickKnob.setPosition(p.x, p.y);
      }
    } else if (type === 'move') {
      if (this.pointerMap.get(p.id) === 'stick') {
        const dx = p.x - this.stick.baseX, dy = p.y - this.stick.baseY; const len = Math.min(70, Math.hypot(dx, dy)); const a = Math.atan2(dy, dx);
        const kx = Math.cos(a) * len, ky = Math.sin(a) * len; this.stickKnob.setPosition(this.stick.baseX + kx, this.stick.baseY + ky);
        touch.x = Math.abs(kx) > 12 ? kx / 70 : 0; touch.y = ky / 70;
      }
    } else {
      const k = this.pointerMap.get(p.id); this.pointerMap.delete(p.id);
      if (!k) return;
      if (k === 'stick') { touch.x = 0; touch.y = 0; this.stickKnob.setPosition(this.stick.baseX, this.stick.baseY); const H = this.scale.height; this.stick.baseX = 130; this.stick.baseY = H - 120; this.stickBase.setPosition(130, H - 120); this.stickKnob.setPosition(130, H - 120); }
      else if (k.startsWith('pad_')) this.applyDpad(k.slice(4), false);
      else { touch[k] = false; const b = this.buttons.find(b => b.key === k); if (b) b.down = false; }
    }
  }
  applyDpad(key, on) {
    const t = this.game_.inputMgr.touch;
    if (key === 'left') t.x = on ? -1 : (t.x < 0 ? 0 : t.x);
    if (key === 'right') t.x = on ? 1 : (t.x > 0 ? 0 : t.x);
    if (key === 'down') t.y = on ? 1 : 0;
    const d = this.dpad.find(d => d.key === key); d.img.setScale(d.r * 2 / 96 * (on ? 0.9 : 1));
  }

  toast(msg, color = '#efe6ff') {
    const W = this.scale.width;
    const t = text(this, W / 2, this.toastY, msg, 17, color, { ox: 0.5, strokeThickness: 4 }).setAlpha(0);
    this.toastY += 26; if (this.toastY > 220) this.toastY = 160;
    this.tweens.add({ targets: t, alpha: 1, y: t.y - 6, duration: 200 });
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => { t.destroy(); } });
  }
  banner(title, sub, color = '#ffd0f0', hold = 1800) {
    const { width: W, height: H } = this.scale;
    const c = this.add.container(W / 2, H * 0.36).setAlpha(0);
    const g = this.add.graphics().fillStyle(0x0b0716, 0.75).fillRect(-W / 2, -38, W, 86);
    g.lineStyle(2, 0xb06aff, 0.8).lineBetween(-W / 2, -38, W / 2, -38).lineBetween(-W / 2, 48, W / 2, 48);
    c.add([g, text(this, 0, -26, title, 34, color, { ox: 0.5, title: true }), text(this, 0, 16, sub || '', 17, '#c8b8ff', { ox: 0.5 })]);
    this.tweens.add({ targets: c, alpha: 1, scaleY: { from: 0.3, to: 1 }, duration: 260 });
    this.tweens.add({ targets: c, alpha: 0, delay: hold, duration: 400, onComplete: () => c.destroy() });
  }

  update(t, delta) {
    const gs = this.game_; const p = gs?.player; if (!p || !p.active) return;
    const st = GameState.getStats(); const d = GameState.data; const dt = delta / 1000;
    this.hpBar.set(p.hp / st.maxHp); this.hpBar.tick(dt);
    this.enBar.set(p.energy / st.maxEnergy);
    this.xpBar.set(d.xp / GameState.xpToNext());
    this.hpText.setText(`${Math.ceil(p.hp)} / ${st.maxHp}`);
    this.lvlText.setText(`Lv.${d.level}`);
    if (this.charShown !== p.charId) {
      this.charShown = p.charId; const c = CHARACTERS[p.charId];
      this.nameText.setText(c.name).setColor('#' + c.color.toString(16));
      this.portrait.setTexture('face_' + p.charId).setDisplaySize(74, 74);
    }
    this.goldText.setText(`${d.gold} G   SP ${d.skillPoints}`);
    this.livesText.setText('♥'.repeat(Math.max(0, gs.lives)));
    const m = GameState.mission(this.levelId); const v = this.side.type === 'kills' ? m.kills : m.chests;
    this.mission.setText(`◆ ${this.missionMain}    ${m.sideDone ? '✔' : '◇'} ${this.side.text} (${Math.min(v, this.side.target)}/${this.side.target})`);
    if (this.itemBtns) for (const b of this.itemBtns) b.countText.setText('×' + GameState.count(b.itemId));
    // skill buttons: cooldown pies & availability
    for (const b of this.buttons) {
      b.ring.clear();
      if (b.key === 'jump') { b.img.setScale(b.baseScale * (b.down ? 0.9 : 1)); continue; }
      const sk = p.def.skills[b.key]; const cd = p.cooldowns[b.key], max = p.cdMax[b.key] || 1;
      const locked = b.key === 'ult' && GameState.skillLevel(p.charId, 'ult') < 1;
      const noEnergy = p.energy < sk.cost;
      b.img.setScale(b.baseScale * (b.down ? 0.9 : 1)).setAlpha(locked ? 0.35 : 1);
      b.t.setAlpha(locked || noEnergy ? 0.45 : 1);
      if (cd > 0) { b.ring.fillStyle(0x000000, 0.55).slice(b.x, b.y, b.r * 0.92, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (cd / max), false).fillPath(); }
      else if (!locked && !noEnergy && b.key !== 'attack') b.ring.lineStyle(2, b.color, 0.6 + Math.sin(t / 200) * 0.3).strokeCircle(b.x, b.y, b.r * 0.95);
    }
  }
}
