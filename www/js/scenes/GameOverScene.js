import { text, button, fadeIn, fadeTo, backdrop } from '../ui/widgets.js';
import { GameState } from '../systems/GameState.js';
import { Audio } from '../systems/AudioManager.js';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }
  init(data) { this.levelId = data.levelId; }
  create() {
    const { width: W, height: H } = this.scale;
    backdrop(this);
    this.add.rectangle(0, 0, W, H, 0x3a0010, 0.35).setOrigin(0);
    const t = text(this, W / 2, H * 0.28, 'GAME OVER', 64, '#ff4a6a', { ox: 0.5, oy: 0.5, title: true });
    this.tweens.add({ targets: t, scale: { from: 1.6, to: 1 }, alpha: { from: 0, to: 1 }, duration: 700, ease: 'Back.easeOut' });
    text(this, W / 2, H * 0.42, 'The Void consumes you… but your will remains.', 18, '#e8c8d8', { ox: 0.5 });
    const cp = GameState.data.checkpoint && GameState.data.checkpoint.levelId === this.levelId;
    button(this, W / 2, H * 0.58, cp ? 'Retry from Checkpoint' : 'Retry Level', () => fadeTo(this, 'Game', { levelId: this.levelId }), { w: 300, h: 50 });
    button(this, W / 2, H * 0.58 + 62, 'Mission Select', () => fadeTo(this, 'LevelSelect'), { w: 300, h: 50 });
    button(this, W / 2, H * 0.58 + 124, 'Main Menu', () => fadeTo(this, 'Menu'), { w: 300, h: 50 });
    Audio.play('boss_roar');
    fadeIn(this, 600);
  }
}
