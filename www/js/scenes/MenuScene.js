import { button, text, fadeIn, fadeTo } from '../ui/widgets.js';
import { GameState } from '../systems/GameState.js';
import { Audio } from '../systems/AudioManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    const { width: W, height: H } = this.scale;
    Audio.init(this); Audio.music('menu');
    this.add.rectangle(0, 0, W, H, 0x0b0716).setOrigin(0);
    // key art from the supplied overview sheet
    const art = this.add.image(W / 2, 0, 'ui_banner').setOrigin(0.5, 0);
    art.setScale(Math.max(W / art.width, (H * 0.78) / art.height));
    this.tweens.add({ targets: art, scale: art.scale * 1.04, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const shade = this.add.graphics();
    for (let i = 0; i < 24; i++) shade.fillStyle(0x0b0716, i / 24).fillRect(0, H * 0.45 + i * 10, W, 10);
    shade.fillStyle(0x0b0716, 1).fillRect(0, H * 0.45 + 240, W, H);
    this.add.particles(0, 0, 'px', { x: { min: 0, max: W }, y: H, speedY: { min: -50, max: -20 }, lifespan: 8000, scale: { min: 0.6, max: 1.6 }, alpha: { start: 0.9, end: 0 }, tint: [0xb06aff, 0xff4a8a], frequency: 90, blendMode: 'ADD' });

    const has = GameState.hasSave();
    const cx = W - 190, y0 = H * 0.5;
    const btns = [
      ['New Game', () => this.newGame()],
      ['Continue', () => { GameState.load(); fadeTo(this, 'LevelSelect'); }, !has],
      ['Settings', () => this.scene.launch('Settings', { from: 'Menu' }).pause()],
      ['Credits', () => fadeTo(this, 'Credits')],
    ];
    btns.forEach(([label, cb, dis], i) => {
      const b = button(this, cx, y0 + i * 62, label, cb, { w: 260, h: 50, disabled: dis });
      b.setAlpha(0); this.tweens.add({ targets: b, alpha: 1, x: { from: cx + 60, to: cx }, delay: 200 + i * 90, duration: 350, ease: 'Back.easeOut' });
    });
    text(this, 24, H - 30, 'v1.0  •  Keyboard: Arrows/WASD move • Space jump • J attack • K heavy • L/Shift dash • I skill • O ultimate • Q swap', 13, '#8a7aa8', { bold: false });
    if (has) {
      const d = GameState.data;
      text(this, 30, H * 0.56, `Save: Lv.${d.level}  •  Stage ${d.currentLevel}/5  •  ${d.gold}G`, 18, '#d8c8ff');
    }
    this.confirm = false;
    if (this._onResume) this.events.off('resume', this._onResume); this._onResume = () => Audio.applyVolume(); this.events.on('resume', this._onResume);
    fadeIn(this);
  }
  newGame() {
    if (GameState.hasSave() && !this.confirm) {
      this.confirm = true;
      const { width: W, height: H } = this.scale;
      this.warn = text(this, W - 190, H * 0.5 - 50, 'Overwrite save? Tap New Game again', 15, '#ffb0c0', { ox: 0.5 });
      return;
    }
    GameState.newGame();
    fadeTo(this, 'Story', { key: 'intro', next: 'CharacterSelect', nextData: { levelId: 1 } });
  }
}
