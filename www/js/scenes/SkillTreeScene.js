// Skill tree: per-character skill upgrades (damage / cooldown, ultimate unlock) + shared passive ranks.
import { CHARACTERS, CHARACTER_ORDER, SKILL_SLOTS } from '../data/characters.js';
import { GameState, PASSIVES } from '../systems/GameState.js';
import { panel, text, button } from '../ui/widgets.js';
import { Audio } from '../systems/AudioManager.js';

export class SkillTreeScene extends Phaser.Scene {
  constructor() { super('SkillTree'); }
  init(data) { this.from = data.from; this.char = GameState.data.active || 'kai'; }
  create() {
    const { width: W, height: H } = this.scale;
    this.add.rectangle(0, 0, W, H, 0x05030a, 0.75).setOrigin(0).setInteractive();
    panel(this, 30, 16, W - 60, H - 32);
    text(this, 60, 28, 'SKILL TREE', 28, '#ffd0f0', { title: true });
    this.sp = text(this, W - 60, 76, '', 18, '#ffd26a', { ox: 1 });
    CHARACTER_ORDER.forEach((id, i) => button(this, 290 + i * 132, 46, CHARACTERS[id].name.split(' ')[0], () => { this.char = id; this.refresh(); }, { w: 122, h: 34, size: 16 }));
    button(this, W / 2, H - 44, 'Close', () => this.close(), { w: 200, h: 40 });
    this.c = this.add.container(0, 0);
    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.onBack = () => this.close(); this.game.events.on('android-back', this.onBack);
    this.events.once('shutdown', () => this.game.events.off('android-back', this.onBack));
    this.refresh();
  }
  refresh() {
    const { width: W } = this.scale; this.c.removeAll(true);
    const d = GameState.data; const ch = CHARACTERS[this.char];
    this.sp.setText(`Skill Points: ${d.skillPoints}`);
    this.c.add(text(this, 60, 76, `${ch.name} — ${ch.title}`, 18, '#' + ch.color.toString(16)));
    const slotName = { attack: 'Basic', heavy: 'Heavy', dash: 'Dash', skill: 'Skill', ult: 'Ultimate' };
    SKILL_SLOTS.forEach((slot, i) => {
      const sk = ch.skills[slot]; const lvl = GameState.skillLevel(this.char, slot); const max = GameState.maxSkill;
      const y = 104 + i * 54;
      const g = this.add.graphics().fillStyle(0x24163e, 0.9).fillRoundedRect(56, y, W - 112, 48, 8);
      if (i > 0) g.lineStyle(2, 0x8a5ad6, 0.5).lineBetween(80, y - 6, 80, y);
      const node = this.add.graphics().fillStyle(lvl ? ch.color : 0x3a2a5a, 1).fillCircle(80, y + 24, 14).lineStyle(2, 0xffffff, 0.7).strokeCircle(80, y + 24, 14);
      const name = text(this, 104, y + 4, `${slotName[slot]}: ${sk.name}`, 16, lvl ? '#ffffff' : '#8a7aa8');
      const info = slot === 'ult' && lvl === 0 ? 'Locked — spend 1 point to unlock this devastating ultimate.' :
        `Damage ×${GameState.skillMult(this.char, slot).toFixed(2)}  •  Cooldown ${(sk.cd * (1 - 0.08 * Math.max(0, lvl - 1))).toFixed(1)}s  •  Energy ${sk.cost}  •  Next rank: +25% dmg, −8% cd`;
      const infoT = text(this, 104, y + 26, info, 12, '#b8a8d8', { bold: false });
      let pips = ''; for (let k = 0; k < max; k++) pips += k < lvl ? '◆' : '◇';
      const pipT = text(this, W - 230, y + 24, pips, 20, '#ffd26a', { ox: 1, oy: 0.5 });
      const b = button(this, W - 140, y + 24, lvl >= max ? 'MAX' : (lvl === 0 ? 'Unlock' : 'Upgrade'), () => { if (GameState.upgradeSkill(this.char, slot)) { Audio.play('levelup'); this.refresh(); } }, { w: 130, h: 34, size: 15, disabled: lvl >= max || d.skillPoints < 1 });
      this.c.add([g, node, name, infoT, pipT, b]);
    });
    this.c.add(text(this, 60, 380, 'Passive Training (shared by all characters)', 16, '#ffd0f0'));
    Object.entries(PASSIVES).forEach(([k, p], i) => {
      const x = 60 + i * ((W - 120) / 5), y = 406, w = (W - 120) / 5 - 10;
      const g = this.add.graphics().fillStyle(0x24163e, 0.9).fillRoundedRect(x, y, w, 70, 8);
      const r = d.passives[k];
      const t1 = text(this, x + 8, y + 4, `${p.name} ${r}/${GameState.maxPassive}`, 14, '#ffffff');
      const t2 = text(this, x + 8, y + 24, p.desc, 11, '#b8a8d8', { bold: false, wrap: w - 16 });
      const b = button(this, x + w / 2, y + 56, '+', () => { if (GameState.upgradePassive(k)) { Audio.play('levelup'); this.refresh(); } }, { w: 60, h: 22, size: 14, disabled: r >= GameState.maxPassive || d.skillPoints < 1 });
      this.c.add([g, t1, t2, b]);
    });
  }
  close() { this.scene.stop(); this.scene.resume(this.from); }
}
