import { text, button, panel, fadeIn, fadeTo, backdrop } from '../ui/widgets.js';
import { GameState } from '../systems/GameState.js';
import { LEVELS } from '../data/levels.js';
import { ITEMS } from '../data/items.js';
import { Audio } from '../systems/AudioManager.js';

export class VictoryScene extends Phaser.Scene {
  constructor() { super('Victory'); }
  init(data) { this.d = data; }
  create() {
    const { width: W, height: H } = this.scale; const lv = LEVELS[this.d.levelId - 1]; const m = GameState.mission(lv.id);
    backdrop(this, { image: 'ui_area_' + lv.key, alpha: 0.3 });
    Audio.music('victory');
    const t = text(this, W / 2, 60, 'MISSION COMPLETE', 46, '#ffd26a', { ox: 0.5, oy: 0.5, title: true });
    this.tweens.add({ targets: t, scale: { from: 0.4, to: 1 }, duration: 600, ease: 'Back.easeOut' });
    panel(this, W / 2 - 280, 110, 560, 300);
    const side = lv.mission.side; const v = side.type === 'kills' ? m.kills : m.chests;
    const lines = [
      [`${lv.name}`, '#ffffff', 22],
      [`✔ ${lv.mission.main}`, '#9affc8', 18],
      [`${m.sideDone ? '✔' : '✘'} ${side.text} (${Math.min(v, side.target)}/${side.target})`, m.sideDone ? '#9affc8' : '#ff9aaa', 18],
      [`Boss: ${this.d.boss}`, '#ffb0c0', 18],
      [`Rewards: +${this.d.xp} XP   +${this.d.gold} G${this.d.drop ? '   ' + ITEMS[this.d.drop].name : ''}`, '#ffd26a', 18],
      [`Now Lv.${GameState.data.level}  •  Skill Points: ${GameState.data.skillPoints}`, '#c8b8ff', 17],
    ];
    lines.forEach(([s, c, size], i) => { const tt = text(this, W / 2, 132 + i * 44, s, size, c, { ox: 0.5 }).setAlpha(0); this.tweens.add({ targets: tt, alpha: 1, delay: 300 + i * 200, duration: 300 }); });
    const last = lv.id >= LEVELS.length;
    button(this, W / 2, H - 70, last ? 'Epilogue ▶' : 'Continue ▶', () => {
      if (last) fadeTo(this, 'Story', { key: 'ending', next: 'Credits', nextData: { ending: true }, music: 'victory' });
      else fadeTo(this, 'Story', { key: 'post' + lv.id, bg: 'ui_area_' + lv.key, next: 'LevelSelect' });
    }, { w: 260, h: 50, color: 0x6a1a5a });
    this.add.particles(0, 0, 'spark', { x: { min: 0, max: W }, y: -10, speedY: { min: 60, max: 160 }, lifespan: 5000, tint: [0xffd26a, 0xff8ac8, 0x8ad8ff], frequency: 80, scale: { min: 0.6, max: 1.4 } });
    fadeIn(this, 500);
  }
}
