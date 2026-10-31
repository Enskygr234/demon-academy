// Visual-novel style dialogue between levels. data: { key, next, nextData }
import { STORY, SPEAKERS } from '../data/story.js';
import { panel, text, button, fadeIn, fadeTo, backdrop } from '../ui/widgets.js';
import { Audio } from '../systems/AudioManager.js';

export class StoryScene extends Phaser.Scene {
  constructor() { super('Story'); }
  init(data) { this.data_ = data; this.lines = STORY[data.key] || []; this.i = 0; this.done = false; this.typing = false; }
  create() {
    const { width: W, height: H } = this.scale;
    backdrop(this, { image: this.data_.bg || 'ui_banner', alpha: 0.35 });
    if (this.data_.music) Audio.music(this.data_.music);
    this.portrait = this.add.image(170, H - 112, 'portrait_kai').setOrigin(0.5, 1).setAlpha(0);
    panel(this, 40, H - 170, W - 80, 140);
    this.nameT = text(this, 70, H - 160, '', 22, '#ff8ab0');
    this.bodyT = text(this, 70, H - 128, '', 20, '#f2eaff', { wrap: W - 160, bold: false, strokeThickness: 3 });
    this.hint = text(this, W - 70, H - 48, 'Tap ▶', 14, '#a898c8', { ox: 1 });
    this.tweens.add({ targets: this.hint, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });
    button(this, W - 90, 36, 'Skip ⏭', () => this.finish(), { w: 140, h: 40, size: 18 });
    this.input.on('pointerdown', (p, objs) => { if (!objs.length) this.advance(); });
    this.input.keyboard?.on('keydown-SPACE', () => this.advance());
    this.input.keyboard?.on('keydown-ENTER', () => this.advance());
    fadeIn(this);
    if (!this.lines.length) return this.finish();
    this.show();
  }
  show() {
    const l = this.lines[this.i]; const sp = SPEAKERS[l.s] || SPEAKERS.narrator;
    this.nameT.setText(sp.name).setColor(sp.color);
    const key = 'portrait_' + l.s;
    if (this.textures.exists(key)) {
      this.portrait.setTexture(key).setAlpha(1); const s = 260 / this.portrait.height; this.portrait.setScale(s);
      this.portrait.x = l.s === 'director' ? this.scale.width - 170 : 170;
      this.tweens.add({ targets: this.portrait, y: { from: this.scale.height - 102, to: this.scale.height - 112 }, duration: 200 });
    } else this.portrait.setAlpha(0);
    this.full = l.t; this.shown = 0; this.typing = true;
    this.typer?.remove();
    this.typer = this.time.addEvent({ delay: 18, repeat: this.full.length, callback: () => {
      this.shown++; this.bodyT.setText(this.full.slice(0, this.shown)); if (this.shown >= this.full.length) this.typing = false;
    } });
  }
  advance() {
    Audio.play('ui');
    if (this.typing) { this.typer?.remove(); this.bodyT.setText(this.full); this.typing = false; return; }
    this.i++; if (this.i >= this.lines.length) return this.finish();
    this.show();
  }
  finish() { if (this.done) return; this.done = true; fadeTo(this, this.data_.next || 'Menu', this.data_.nextData || {}); }
}
