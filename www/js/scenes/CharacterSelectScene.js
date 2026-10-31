// Character selection before each mission. All four Astra students can be swapped mid-level (Q / swap button).
import { CHARACTERS, CHARACTER_ORDER } from '../data/characters.js';
import { LEVELS } from '../data/levels.js';
import { GameState } from '../systems/GameState.js';
import { panel, text, button, fadeIn, fadeTo, backdrop } from '../ui/widgets.js';
import { Audio } from '../systems/AudioManager.js';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() { super('CharacterSelect'); }
  init(data) { this.levelId = data.levelId || 1; this.sel = GameState.data.active || 'kai'; }
  create() {
    const { width: W, height: H } = this.scale; const lv = LEVELS[this.levelId - 1];
    backdrop(this, { image: 'ui_area_' + lv.key, alpha: 0.25 });
    text(this, W / 2, 20, 'CHOOSE YOUR FIGHTER', 30, '#ffd0f0', { ox: 0.5, title: true });
    text(this, W / 2, 58, `Mission ${lv.id}: ${lv.name} — ${lv.mission.main}`, 17, '#c8b8ff', { ox: 0.5 });
    this.cards = {};
    const cw = 200, x0 = (W - cw * 4 - 36) / 2;
    CHARACTER_ORDER.forEach((id, i) => {
      const c = CHARACTERS[id]; const x = x0 + i * (cw + 12), y = 90;
      const cont = this.add.container(x, y);
      const g = this.add.graphics(); cont.add(g);
      const por = this.add.image(cw / 2, 190, 'portrait_' + id).setOrigin(0.5, 1); por.setScale(Math.min(180 / por.width, 180 / por.height));
      cont.add(por);
      const spr = this.add.sprite(cw / 2, 290, id, 'idle_0'); spr.play(`${id}_idle`); cont.add(spr);
      const m = this.cache.json.get('sprite_meta')[id]; spr.setOrigin(m.anchorX / m.frameW, m.anchorY / m.frameH);
      cont.add(text(this, cw / 2, 196, c.name, 20, '#' + c.color.toString(16), { ox: 0.5 }));
      cont.add(text(this, cw / 2, 222, c.title, 13, '#c8b8ff', { ox: 0.5, bold: false }));
      const z = this.add.zone(cw / 2, 150, cw, 300).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => { Audio.play('ui'); this.select(id); });
      cont.add(z);
      this.cards[id] = { g, cont, spr };
    });
    panel(this, 30, 398, W - 60, 82);
    this.info = text(this, 50, 408, '', 15, '#efe6ff', { wrap: W - 100, bold: false, strokeThickness: 3 });
    button(this, W - 130, H - 30, 'Start ▶', () => this.start(), { w: 200, h: 46, color: 0x6a1a5a });
    button(this, 130, H - 30, '◀ Back', () => fadeTo(this, 'LevelSelect'), { w: 200, h: 46 });
    this.input.keyboard?.on('keydown-ENTER', () => this.start());
    this.input.keyboard?.on('keydown-LEFT', () => this.step(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.step(1));
    this.select(this.sel);
    fadeIn(this);
  }
  step(d) { const o = CHARACTER_ORDER; this.select(o[(o.indexOf(this.sel) + d + o.length) % o.length]); }
  select(id) {
    this.sel = id;
    for (const [k, c] of Object.entries(this.cards)) {
      const on = k === id; c.g.clear();
      c.g.fillStyle(0x000000, 0.5).fillRoundedRect(4, 5, 200, 300, 12);
      c.g.fillStyle(on ? 0x2e1a52 : 0x170d2b, 1).fillRoundedRect(0, 0, 200, 300, 12);
      c.g.lineStyle(on ? 3 : 2, on ? CHARACTERS[k].color : 0x5a4a7a).strokeRoundedRect(0, 0, 200, 300, 12);
      c.cont.setScale(on ? 1.02 : 0.97); c.spr.play(`${k}_${on ? 'run' : 'idle'}`, true);
    }
    const c = CHARACTERS[id]; const sk = c.skills;
    this.info.setText(`${c.name} — ${c.desc}\nATK ${sk.attack.name} • HEAVY ${sk.heavy.name} • DASH ${sk.dash.name} • SKILL ${sk.skill.name} • ULT ${sk.ult.name}${GameState.skillLevel(id, 'ult') < 1 ? ' (locked – Skill Tree)' : ''}`);
  }
  start() {
    GameState.data.active = this.sel; GameState.data.currentLevel = this.levelId; GameState.save();
    const lv = LEVELS[this.levelId - 1];
    fadeTo(this, 'Story', { key: 'pre' + this.levelId, bg: 'ui_area_' + lv.key, next: 'Game', nextData: { levelId: this.levelId } });
  }
}
