import { AssetLoader } from '../systems/AssetLoader.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() { AssetLoader.preloadManifest(this); }
  create() { this.scene.start('Preload'); }
}
