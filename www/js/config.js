// Global constants shared across the game.
export const GAME_W = 960;
export const GAME_H = 540;
export const TILE = 32;
export const ROWS = 17;            // level height in tiles (17 * 32 = 544)
export const GRAVITY = 1500;
export const SAVE_KEY = 'demon_academy_save_v1';
export const SETTINGS_KEY = 'demon_academy_settings_v1';

export const FONT = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';
export const TITLE_FONT = 'Georgia, "Times New Roman", serif';

export const COLORS = {
  bg: 0x0b0716,
  panel: 0x1a1030,
  panelEdge: 0x8a5ad6,
  text: '#efe6ff',
  dim: '#a898c8',
  gold: '#ffd26a',
  hp: 0xe0405a,
  energy: 0x4a9aff,
  xp: 0xb06aff,
  boss: 0xd02a4a,
};

// Element colours used for damage numbers and generated effects
export const ELEMENT = {
  aether: 0xff4a6a, void: 0xb05aff, ice: 0x6ac8ff, fire: 0xff8a2a, light: 0xffe08a, nature: 0x6aff8a, physical: 0xffffff,
};

export const DEPTH = {
  sky: -100, far: -90, vortex: -85, mid: -80, props: -10, tiles: 0, pickups: 5, enemies: 10, boss: 12,
  player: 20, projectiles: 25, fx: 30, numbers: 40, foreground: 50,
};
