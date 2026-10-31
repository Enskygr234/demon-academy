import { panel, button, text } from '../ui/widgets.js';
import { GameState } from '../systems/GameState.js';
import { Audio } from '../systems/AudioManager.js';

export class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }
  init(data) { this.from = data.from; }
  create() {
    const { width: W, height: H } = this.scale; const S = GameState.settings;
    this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0).setInteractive();
    panel(this, W / 2 - 260, 60, 520, 420);
    text(this, W / 2, 84, 'SETTINGS', 30, '#ffd0f0', { ox: 0.5, title: true });
    const rows = [
      ['Music Volume', () => `${Math.round(S.music * 100)}%`, () => { S.music = (Math.round(S.music * 10) + 1) % 11 / 10; }],
      ['SFX Volume', () => `${Math.round(S.sfx * 100)}%`, () => { S.sfx = (Math.round(S.sfx * 10) + 1) % 11 / 10; Audio.play('pickup'); }],
      ['Touch Controls', () => ({ auto: 'Auto', on: 'Always', off: 'Off' })[S.touch], () => { S.touch = { auto: 'on', on: 'off', off: 'auto' }[S.touch]; }],
      ['Movement Pad', () => (S.joystick === 'stick' ? 'Joystick' : 'D-Pad Buttons'), () => { S.joystick = S.joystick === 'stick' ? 'dpad' : 'stick'; }],
      ['Screen Shake', () => (S.shake ? 'On' : 'Off'), () => { S.shake = !S.shake; }],
      ['Damage Numbers', () => (S.damageNumbers ? 'On' : 'Off'), () => { S.damageNumbers = !S.damageNumbers; }],
    ];
    rows.forEach(([label, val, change], i) => {
      const y = 150 + i * 50;
      text(this, W / 2 - 220, y, label, 20, '#e8dcff', { oy: 0.5 });
      const b = button(this, W / 2 + 130, y, val(), () => { change(); b.label.setText(val()); GameState.saveSettings(); Audio.applyVolume(); }, { w: 180, h: 40, size: 18 });
    });
    button(this, W / 2, 445, 'Back', () => this.close(), { w: 200, h: 44 });
    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.onBack = () => this.close(); this.game.events.on('android-back', this.onBack);
    this.events.once('shutdown', () => this.game.events.off('android-back', this.onBack));
  }
  close() {
    GameState.saveSettings(); Audio.applyVolume();
    this.scene.stop(); this.scene.resume(this.from);
    this.scene.get(this.from)?.events.emit('settings-closed');
  }
}
