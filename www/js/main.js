// Entry point: Phaser game configuration and scene registry.
import { GAME_W, GAME_H, GRAVITY } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { CreditsScene } from './scenes/CreditsScene.js';
import { StoryScene } from './scenes/StoryScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { CharacterSelectScene } from './scenes/CharacterSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { InventoryScene } from './scenes/InventoryScene.js';
import { SkillTreeScene } from './scenes/SkillTreeScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { VictoryScene } from './scenes/VictoryScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0b0716',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY }, debug: false, tileBias: 32 } },
  input: { activePointers: 5 },
  fps: { target: 60, smoothStep: true },
  render: { powerPreference: 'high-performance', batchSize: 2048 },
  scene: [BootScene, PreloadScene, MenuScene, SettingsScene, CreditsScene, StoryScene, LevelSelectScene, CharacterSelectScene,
    GameScene, UIScene, PauseScene, InventoryScene, SkillTreeScene, GameOverScene, VictoryScene],
};

const game = new Phaser.Game(config);
window.__game = game; // handy for debugging / automated tests

// Android hardware back button -> pause / close overlay (Capacitor @capacitor/app plugin; Cordova-style event as fallback)
const capApp = window.Capacitor?.Plugins?.App;
if (capApp) capApp.addListener('backButton', () => game.events.emit('android-back'));
document.addEventListener('backbutton', () => game.events.emit('android-back'), false);
// Pause audio when app is backgrounded
document.addEventListener('visibilitychange', () => { if (document.hidden) game.events.emit('app-hidden'); });
