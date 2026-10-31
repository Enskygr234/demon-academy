// Manifest-driven asset loading. Any asset that fails to load is replaced by a generated placeholder
// texture so the game keeps running; swapping in real art only requires editing assets/data/manifest.json.
export const AssetLoader = {
  preloadManifest(scene) {
    scene.load.json('manifest', 'assets/data/manifest.json');
    scene.load.json('sprite_meta', 'assets/data/sprite_meta.json');
    scene.load.json('anim_defs', 'assets/data/animations.json');
  },

  preloadAssets(scene) {
    const man = scene.cache.json.get('manifest');
    this.failed = new Set();
    scene.load.on('loaderror', file => { console.warn('[AssetLoader] missing', file.key); this.failed.add(file.key); });
    for (const a of man.atlases) scene.load.atlas(a.key, a.png, a.json);
    for (const [k, path] of Object.entries(man.images)) scene.load.image(k, path);
    for (const f of (man.audio.files || [])) scene.load.audio(f.key, f.path);
  },

  finalize(scene) {
    for (const key of this.failed || []) this.placeholder(scene, key);
    this.makeGeneratedTextures(scene);
    this.createAnimations(scene);
  },

  placeholder(scene, key) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xff00ff, 0.8).fillRect(0, 0, 48, 64).lineStyle(2, 0xffffff).strokeRect(1, 1, 46, 62);
    g.generateTexture(key, 48, 64); g.destroy();
  },

  createAnimations(scene) {
    const meta = scene.cache.json.get('sprite_meta');
    const defs = scene.cache.json.get('anim_defs');
    for (const [key, m] of Object.entries(meta)) {
      if (!scene.textures.exists(key) || (this.failed && this.failed.has(key))) continue;
      for (const [anim, n] of Object.entries(m.anims)) {
        const d = Object.assign({ fps: 10, repeat: 0 }, defs.defaults[anim], defs.overrides[key]?.[anim]);
        const k = `${key}_${anim}`;
        if (scene.anims.exists(k)) continue;
        scene.anims.create({ key: k, frames: Array.from({ length: n }, (_, i) => ({ key, frame: `${anim}_${i}` })), frameRate: d.fps, repeat: d.repeat });
      }
    }
  },

  // Small generated textures for particles, projectiles and UI (keeps the asset count low on Android)
  makeGeneratedTextures(scene) {
    const make = (key, w, h, fn) => { if (scene.textures.exists(key)) return; const g = scene.make.graphics({ add: false }); fn(g); g.generateTexture(key, w, h); g.destroy(); };
    make('px', 4, 4, g => g.fillStyle(0xffffff).fillRect(0, 0, 4, 4));
    make('spark', 8, 8, g => { g.fillStyle(0xffffff).fillRect(3, 0, 2, 8).fillRect(0, 3, 8, 2); });
    make('glow', 64, 64, g => { for (let r = 32; r > 0; r -= 2) { g.fillStyle(0xffffff, 0.06 + (1 - r / 32) * 0.25).fillCircle(32, 32, r); } });
    make('ring', 128, 128, g => { g.lineStyle(6, 0xffffff, 1).strokeCircle(64, 64, 58); g.lineStyle(2, 0xffffff, 0.5).strokeCircle(64, 64, 50); });
    make('orb', 24, 24, g => { g.fillStyle(0xffffff, 0.35).fillCircle(12, 12, 12); g.fillStyle(0xffffff, 1).fillCircle(12, 12, 7); });
    make('bolt', 40, 12, g => { g.fillStyle(0xffffff, 0.4).fillRoundedRect(0, 0, 40, 12, 6); g.fillStyle(0xffffff, 1).fillRoundedRect(6, 3, 32, 6, 3); });
    make('shard', 28, 12, g => { g.fillStyle(0xffffff, 1).fillTriangle(0, 6, 20, 0, 20, 12).fillTriangle(20, 0, 28, 6, 20, 12); });
    make('wave', 40, 80, g => { g.fillStyle(0xffffff, 0.5).fillEllipse(14, 40, 26, 80); g.fillStyle(0xffffff, 1).fillEllipse(20, 40, 14, 66); });
    make('beam', 64, 40, g => { g.fillStyle(0xffffff, 0.35).fillRect(0, 0, 64, 40); g.fillStyle(0xffffff, 0.8).fillRect(0, 10, 64, 20); g.fillStyle(0xffffff, 1).fillRect(0, 16, 64, 8); });
    make('shockwave', 64, 24, g => { g.fillStyle(0xffffff, 0.5).fillEllipse(32, 16, 64, 16); g.fillStyle(0xffffff, 1).fillTriangle(10, 20, 32, 0, 54, 20); });
    make('rock', 26, 26, g => { g.fillStyle(0x6a6080).fillCircle(13, 13, 12); g.fillStyle(0x9a90b0).fillCircle(9, 9, 5); g.lineStyle(2, 0x2a2040).strokeCircle(13, 13, 12); });
    make('shadow', 64, 16, g => { g.fillStyle(0x000000, 0.35).fillEllipse(32, 8, 64, 14); });
    make('btn', 96, 96, g => { g.fillStyle(0x000000, 0.35).fillCircle(48, 48, 46); g.lineStyle(3, 0xffffff, 0.55).strokeCircle(48, 48, 44); });
    make('stick_base', 160, 160, g => { g.fillStyle(0x000000, 0.25).fillCircle(80, 80, 78); g.lineStyle(3, 0xffffff, 0.35).strokeCircle(80, 80, 76); });
    make('stick_knob', 72, 72, g => { g.fillStyle(0xffffff, 0.35).fillCircle(36, 36, 34); g.lineStyle(3, 0xffffff, 0.7).strokeCircle(36, 36, 32); });
  },
};
