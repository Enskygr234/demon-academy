// World map / stage select. Also the hub for Inventory and Skill Tree between missions.
import { LEVELS } from '../data/levels.js';
import { GameState } from '../systems/GameState.js';
import { panel, text, button, fadeIn, fadeTo, backdrop } from '../ui/widgets.js';
import { Audio } from '../systems/AudioManager.js';

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelect'); }
  create() {
    const { width: W, height: H } = this.scale; const d = GameState.data;
    backdrop(this, { image: 'ui_banner', alpha: 0.08 });
    Audio.music('menu');
    text(this, W / 2, 22, 'AETHERIA — SELECT MISSION', 28, '#ffd0f0', { ox: 0.5, title: true });
    this.header = text(this, W / 2, 60, '', 17, '#d8c8ff', { ox: 0.5 });
    const cw = 168, gap = 14, x0 = (W - (cw * 5 + gap * 4)) / 2;
    LEVELS.forEach((lv, i) => {
      const x = x0 + i * (cw + gap), y = 88; const locked = lv.id > d.unlocked; const done = d.completed.includes(lv.id);
      const card = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.5).fillRoundedRect(4, 5, cw, 370, 10);
      g.fillStyle(0x170d2b, 1).fillRoundedRect(0, 0, cw, 370, 10);
      const img = this.add.image(cw / 2, 8, 'ui_area_' + lv.key).setOrigin(0.5, 0); img.setDisplaySize(cw - 16, 230);
      if (locked) img.setTint(0x333344);
      g.lineStyle(2, done ? 0xffd26a : (locked ? 0x4a4060 : 0x9a6ae6)).strokeRoundedRect(0, 0, cw, 370, 10);
      card.add([g, img]);
      card.add(text(this, cw / 2, 246, `${lv.id}. ${lv.name}`, 16, locked ? '#6a6080' : '#ffffff', { ox: 0.5 }));
      const m = d.missions[lv.id];
      const status = locked ? '🔒 Locked' : done ? '★ Cleared' : 'New!';
      card.add(text(this, cw / 2, 272, status, 15, done ? '#ffd26a' : (locked ? '#6a6080' : '#9affc8'), { ox: 0.5 }));
      if (!locked) {
        const side = lv.mission.side; const v = m ? (side.type === 'kills' ? m.kills : m.chests) : 0;
        card.add(text(this, cw / 2, 296, `${m?.sideDone ? '✔' : '◇'} ${side.text}\n(${Math.min(v, side.target)}/${side.target})`, 13, '#b8a8d8', { ox: 0.5, align: 'center', bold: false }));
      }
      if (!locked) {
        const z = this.add.zone(cw / 2, 185, cw, 370).setInteractive({ useHandCursor: true });
        z.on('pointerover', () => card.setScale(1.03)); z.on('pointerout', () => card.setScale(1));
        z.on('pointerup', () => { Audio.play('ui'); fadeTo(this, 'CharacterSelect', { levelId: lv.id }); });
        card.add(z);
      }
    });
    const by = H - 46;
    button(this, W / 2 - 300, by, 'Inventory', () => this.openOverlay('Inventory'), { w: 180, h: 46 });
    button(this, W / 2 - 100, by, 'Skill Tree', () => this.openOverlay('SkillTree'), { w: 180, h: 46 });
    button(this, W / 2 + 100, by, 'Settings', () => this.openOverlay('Settings'), { w: 180, h: 46 });
    button(this, W / 2 + 300, by, 'Main Menu', () => fadeTo(this, 'Menu'), { w: 180, h: 46 });
    if (this._onResume) this.events.off('resume', this._onResume); this._onResume = () => this.refresh(); this.events.on('resume', this._onResume);
    this.refresh();
    fadeIn(this);
  }
  openOverlay(key) { this.scene.launch(key, { from: 'LevelSelect' }); this.scene.pause(); }
  refresh() {
    const d = GameState.data, st = GameState.getStats();
    this.header.setText(`Lv.${d.level}   XP ${d.xp}/${GameState.xpToNext()}   HP ${st.maxHp}   ATK ×${st.atk.toFixed(2)}   Gold ${d.gold}   Skill Points ${d.skillPoints}`);
  }
}
