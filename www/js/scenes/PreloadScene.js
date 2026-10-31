import { AssetLoader } from '../systems/AssetLoader.js';
import { Audio } from '../systems/AudioManager.js';
import { GameState } from '../systems/GameState.js';
import { FONT } from '../config.js';

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }
  preload() {
    const { width: W, height: H } = this.scale;
    const title = this.add.text(W / 2, H / 2 - 50, 'DEMON ACADEMY', { fontFamily: 'Georgia, serif', fontSize: '42px', color: '#ff7ab8', stroke: '#1a0a2a', strokeThickness: 6 }).setOrigin(0.5);
    const box = this.add.graphics().fillStyle(0x1a1030).fillRoundedRect(W / 2 - 202, H / 2 + 8, 404, 24, 8).lineStyle(2, 0x8a5ad6).strokeRoundedRect(W / 2 - 202, H / 2 + 8, 404, 24, 8);
    const barG = this.add.graphics();
    const label = this.add.text(W / 2, H / 2 + 50, 'Loading…', { fontFamily: FONT, fontSize: '16px', color: '#a898c8' }).setOrigin(0.5);
    this.load.on('progress', v => { barG.clear().fillStyle(0xb06aff).fillRoundedRect(W / 2 - 198, H / 2 + 12, 396 * v, 16, 6); });
    this.load.on('fileprogress', f => label.setText('Loading ' + f.key));
    AssetLoader.preloadAssets(this);
  }
  create() {
    AssetLoader.finalize(this);
    Audio.init(this);
    GameState.load();
    // resume WebAudio on first interaction (mobile autoplay policies)
    this.input.once('pointerdown', () => Audio.unlock());
    this.input.keyboard?.once('keydown', () => Audio.unlock());
    this.game.events.on('app-hidden', () => { GameState.save(); });
    this.scene.start('Menu');
  }
}
