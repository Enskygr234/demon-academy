import { panel, text, button } from '../ui/widgets.js';
import { GameState } from '../systems/GameState.js';
import { Audio } from '../systems/AudioManager.js';

export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }
  init(data) { this.open = data?.open; }
  create() {
    const { width: W, height: H } = this.scale; const d = GameState.data; const st = GameState.getStats();
    this.add.rectangle(0, 0, W, H, 0x05030a, 0.7).setOrigin(0).setInteractive();
    panel(this, W / 2 - 200, 50, 400, 440);
    text(this, W / 2, 70, 'PAUSED', 32, '#ffd0f0', { ox: 0.5, title: true });
    text(this, W / 2, 112, `Lv.${d.level}  HP ${st.maxHp}  ATK ×${st.atk.toFixed(2)}  DEF ${Math.round(st.def * 100)}%  Gold ${d.gold}`, 14, '#c8b8ff', { ox: 0.5 });
    const items = [
      ['Resume', () => this.resume()],
      ['Inventory', () => this.overlay('Inventory')],
      ['Skill Tree', () => this.overlay('SkillTree')],
      ['Settings', () => this.overlay('Settings')],
      ['Restart Level', () => this.restart()],
      ['Quit to Map', () => this.quit()],
    ];
    items.forEach(([l, cb], i) => button(this, W / 2, 160 + i * 52, l, cb, { w: 260, h: 44 }));
    this.input.keyboard?.on('keydown-ESC', () => this.resume());
    this.input.keyboard?.on('keydown-P', () => this.resume());
    this.onBack = () => this.resume(); this.game.events.on('android-back', this.onBack);
    this.events.once('shutdown', () => this.game.events.off('android-back', this.onBack));
    if (this.open) this.time.delayedCall(10, () => this.overlay(this.open));
  }
  overlay(key) { this.scene.launch(key, { from: 'Pause' }); this.scene.pause(); }
  resume() {
    if (!this.scene.isActive()) return;
    Audio.play('ui_back');
    this.scene.stop(); this.scene.resume('Game'); this.scene.resume('UI');
  }
  restart() {
    GameState.data.checkpoint = null; GameState.data.hp = null; GameState.data.energy = null; GameState.save();
    const id = this.scene.get('Game').levelId;
    this.scene.stop('UI'); this.scene.stop(); this.scene.stop('Game');
    this.scene.start('Game', { levelId: id });
  }
  quit() {
    const g = this.scene.get('Game'); GameState.data.hp = null; GameState.data.energy = null; GameState.save();
    this.scene.stop('UI'); this.scene.stop('Game'); Audio.stopMusic(); this.scene.start('LevelSelect');
  }
}
