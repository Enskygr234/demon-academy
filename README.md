# Demon Academy

A 2D anime pixel-art side-scrolling action RPG built with **Phaser 3** (Arcade Physics) and packaged for Android with **Capacitor**.

Kai Ren, Mira Yuki, Ryu Kazan and Elena Voss fight through five stages — Astra Academy, Forbidden Forest, Underground Lab, Broken City and the Void Gate — to stop The Director from opening the Void Gate.

---

## Quick start (browser)

The game is plain ES modules with no build step. Serve the `www/` folder with any static server:

```bash
cd www
python3 -m http.server 8080        # or: npx http-server -c-1
# open http://localhost:8080
```

`www/lib/phaser.min.js` (Phaser 3.90, arcade-physics build) is already bundled, so it runs offline.

### Controls

| Action | Keyboard | Touch (Android) |
|---|---|---|
| Move (hold Ctrl = walk) | ← → / A D | Left joystick (small push = walk, full = run) or D-pad (Settings) |
| Jump / double jump | Space / W / ↑ / Z | JUMP |
| Drop through platform | ↓ + Jump | Joystick down + JUMP |
| Basic attack (hold for combo) | J / X | ATK |
| Heavy attack | K / C | HVY |
| Dash (i-frames) | L / Shift | DASH |
| Skill | I / V | SKL |
| Ultimate (unlock in Skill Tree) | O / B | ULT |
| Swap character | Q | ⇄ |
| Potion / Ether | 1 / 2 | ⚗ / ✦ |
| Pause | Esc / P | ❚❚ / Android back button |
| Inventory | Tab | Pause → Inventory |

---

## Android APK (Capacitor)

Every push to `main` builds a debug APK with GitHub Actions and publishes it under **Releases**.
The app icon (adaptive + legacy) and splash screen are generated from `assets/` by `@capacitor/assets`; rebuild them with `python3 tools/make_icon.py <art-folder>/ assets/`.


Requirements: Node 18+, JDK 17, Android Studio (SDK 34) with `ANDROID_HOME` set.

```bash
npm install                 # Phaser + Capacitor 6 (core, cli, android, app)
npm run copy:phaser         # optional: refresh www/lib/phaser.min.js from node_modules
npm run android:setup       # npx cap add android + landscape/fullscreen/immersive config
npm run android:debug       # sync web assets and build the debug APK
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Install it with
`adb install -r android/app/build/outputs/apk/debug/app-debug.apk`, or run `npm run cap:open` to build/run from Android Studio.

**Release build**

1. Create a keystore: `keytool -genkey -v -keystore demon-academy.keystore -alias demonacademy -keyalg RSA -keysize 2048 -validity 10000`
2. In Android Studio choose *Build → Generate Signed Bundle / APK* (or configure `signingConfigs` in `android/app/build.gradle`).
3. `npm run android:release` → `android/app/build/outputs/apk/release/`.

After changing anything in `www/`, run `npx cap sync android` (the `android:debug` script does this automatically).
`android-config/apply-android-config.js` re-applies: `sensorLandscape` orientation, hardware acceleration, fullscreen theme with display-cutout support, immersive sticky mode and keep-screen-on.

---

## Project structure

```
www/
  index.html, css/style.css, lib/phaser.min.js
  assets/
    sprites/   per-character texture atlases (PNG + Phaser JSON hash) extracted from the supplied sheets
    fx/        effect sprites cut from the supplied sheets (slashes, eruptions, leaves, orbs…)
    bg/        original parallax layers (far / mid) for all 5 areas + void vortex
    tiles/     tilesets (ground, platforms, edges, spikes, blocks) + environmental props
    portraits/ dialogue portraits + HUD faces          ui/  key art, area cards
    data/      manifest.json (asset loader), sprite_meta.json (frame anchors), animations.json (fps/loop per animation)
  js/
    main.js, config.js
    data/      characters, enemies, bosses, items, levels (layout language), story
    systems/   GameState (RPG + save/load), AssetLoader, AudioManager, InputManager, LevelBuilder, Pools
    entities/  Player, Enemy, Boss
    scenes/    Boot, Preload, Menu, Settings, Credits, Story, LevelSelect, CharacterSelect,
               Game, UI (HUD + touch controls), Pause, Inventory, SkillTree, GameOver, Victory
    ui/        widgets (panels, buttons, bars)
android-config/  Android post-processing script
capacitor.config.json
```

### Asset pipeline

* **Characters / enemies** – the supplied sprite sheets were segmented automatically (background removal → per-row frame splitting → body-anchored alignment) into trimmed atlases, so every frame shares the same foot anchor. Animation frame counts live in `assets/data/sprite_meta.json`; frame rates/looping in `assets/data/animations.json`.
* **Modular loader** – everything is listed in `assets/data/manifest.json`. To replace an asset, drop in a new file and update the path. Missing files are replaced by a magenta placeholder at runtime instead of crashing.
* **Audio** – `AudioManager` plays real files if present (add `{ "key": "sfx_sword", "path": "assets/audio/sword.ogg" }` or `music_<track>` entries to `manifest.json → audio.files`); otherwise it synthesises placeholder SFX and chiptune music with WebAudio.

### Levels

Levels are written in a compact token language (`js/data/levels.js`), parsed by `LevelBuilder` into an Arcade tilemap:
`F12` flat ground · `G3` pit · `U1/D1` raise/lower ground · `S3` spikes · `X8` gap bridged by floating platforms · `P4@3` one-way platform · `B3@4` solid block · `E:wolf@2` enemy · `I:chest` pickup · `O:lamp` prop · `C` checkpoint · `BOSS:key` boss arena.

---

## Systems implemented

* **Movement** – walk → run acceleration, jump with coyote time & input buffer, variable jump height, double jump, falling, one-way platforms (drop-through), dash with afterimages and i-frames, knockback.
* **Combat** – data-driven skills (melee combos, projectiles, novas, beams, ground zones, healing), hit-stop, crits, elemental damage numbers, burn / slow / freeze statuses, cooldowns and energy costs, pooled projectiles/particles/damage text.
* **Characters** – Kai (Aether Slash, Void Slash, Shadow Dash, Void Explosion, Void Requiem ult), Mira (Ice Projectile, Frozen Ground, Ice Nova, Absolute Zero), Ryu (Flame Slash, Fireball, Fire Explosion, Inferno Dragon), Elena (Light Projectile, Holy Explosion, Healing Light, Divine Judgment). Swap anytime.
* **Enemies** – 6 archetypes with state-machine AI (patrol/alert/chase/melee/cast/charge/leap/hover-shoot), ledge detection, off-screen culling.
* **Bosses** – Training Golem, Ancient Guardian, Prototype Zero, Crimson Knight, The Director: 11 attack patterns (charge, slam shockwaves, rock/orb rain, aimed fans, homing missiles, telegraphed beams, teleport strikes, summons, void spikes, leaps, orb rings) and enrage phases (The Director has 3).
* **RPG** – XP/levels, stats (HP, energy, ATK, DEF, crit, CDR, regen, speed), skill tree (per-skill ranks + ultimate unlock + 5 shared passives), inventory, consumables, weapons/armor/accessories, shop, chests, boss drops, main + side missions per level, checkpoints, lives, local save/load (localStorage) with autosave.
* **UI** – main menu, story dialogue, mission select, character select, HUD (HP/energy/XP/level/gold/lives/mission tracker), boss bar, pause, inventory, skill tree, settings, game over, victory, credits; multi-touch controls with cooldown indicators.

## Known limitations / what remains

* **Training Golem** has no supplied art; it uses a blue-tinted, smaller Ancient Guardian as a placeholder (flagged in `data/bosses.js`).
* **Bosses, Security Drone and Failed Experiment** were supplied as single poses (overview sheet), so they are animated procedurally (breathing, squash, lunges, flashes) rather than frame-by-frame. Supplying frame sheets for them only requires adding atlas entries + `anims` to their definitions.
* The Corrupted Paladin sheet (dark JPEG background) was used for the Void Soldier; its cut-out is slightly rougher than the transparent PNG sheets.
* Audio is synthesised placeholder audio — swap in real music/SFX via the manifest.
* The APK must be built on a machine with the Android SDK (not included here).
