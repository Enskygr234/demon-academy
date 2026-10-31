import { button, text, fadeIn, fadeTo, backdrop } from '../ui/widgets.js';
import { Audio } from '../systems/AudioManager.js';

export class CreditsScene extends Phaser.Scene {
  constructor() { super('Credits'); }
  init(data) { this.ending = data?.ending; }
  create() {
    const { width: W, height: H } = this.scale;
    backdrop(this, { image: 'ui_banner', alpha: 0.25 });
    Audio.music(this.ending ? 'victory' : 'menu');
    const lines = [
      ['DEMON ACADEMY', 40, '#ff8ac8'], ['A 2D anime pixel-art action RPG', 18, '#c8b8ff'], ['', 12],
      ['Game Design & Programming', 22, '#ffd26a'], ['Built with Phaser 3 + Capacitor', 18, '#e8dcff'], ['', 12],
      ['Character & Enemy Art', 22, '#ffd26a'], ['Supplied sprite sheets: Kai Ren, Mira Yuki, Ryu Kazan, Elena Voss,', 16, '#e8dcff'],
      ['Shadow Wolf, Forest Spirit, Corrupted Student, Void Soldier, bosses', 16, '#e8dcff'], ['', 12],
      ['Backgrounds, tiles & props', 22, '#ffd26a'], ['Original procedural pixel art for all five areas', 16, '#e8dcff'], ['', 12],
      ['Music & Sound', 22, '#ffd26a'], ['Synthesised placeholder chiptune (swap in real audio via manifest.json)', 16, '#e8dcff'], ['', 12],
      [this.ending ? 'Thank you for playing!' : 'Thank you!', 26, '#ffffff'],
    ];
    const c = this.add.container(W / 2, H + 20);
    let y = 0; for (const [s, size, col] of lines) { c.add(text(this, 0, y, s, size, col || '#fff', { ox: 0.5, title: size >= 26 })); y += size + 14; }
    this.tweens.add({ targets: c, y: 60, duration: 9000, ease: 'Sine.easeOut' });
    button(this, W - 120, H - 40, 'Back', () => fadeTo(this, 'Menu'), { w: 180, h: 44 });
    fadeIn(this);
  }
}
