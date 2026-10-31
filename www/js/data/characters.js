// Playable characters. Sprite atlases come from the supplied sheets (see assets/data/sprite_meta.json).
// Every skill entry is data-driven: the Player class reads `kind` and executes the matching behaviour.
//   kind: melee      -> hitbox in front of the player on the given animation frame
//         projectile -> spawns pooled projectile(s)
//         dashStrike -> damaging dash
//         nova       -> radial burst around player
//         ground     -> lingering ground zone (slow/burn)
//         heal       -> restores HP (+ optional burst)
//         beam       -> long piercing line
export const CHARACTERS = {
  kai: {
    name: 'Kai Ren', title: 'Aether & Void', element: 'aether', color: 0xff4a6a,
    speed: 230, jump: 560, baseAtk: 1.0,
    desc: 'Balanced swordsman who wields both Aether and Void energy.',
    skills: {
      attack:  { name: 'Aether Slash',  kind: 'melee', anim: 'attack', dmg: 14, cost: 0,  cd: 0.28, range: 70, h: 60, element: 'aether', combo: true, sfx: 'sword' },
      heavy:   { name: 'Void Slash',    kind: 'projectile', anim: 'heavy', dmg: 26, cost: 12, cd: 1.0, element: 'void', proj: 'voidwave', speed: 520, sfx: 'void' },
      dash:    { name: 'Shadow Dash',   kind: 'dashStrike', anim: 'dash', dmg: 12, cost: 6, cd: 0.7, element: 'void', dist: 190, sfx: 'dash' },
      skill:   { name: 'Void Explosion',kind: 'nova', anim: 'skill', dmg: 45, cost: 30, cd: 6, radius: 150, element: 'void', sfx: 'explode' },
      ult:     { name: 'Void Requiem',  kind: 'beam', anim: 'skill', dmg: 120, cost: 70, cd: 20, length: 620, element: 'void', sfx: 'ult' },
    },
  },
  mira: {
    name: 'Mira Yuki', title: 'Frost Princess', element: 'ice', color: 0x6ac8ff,
    speed: 220, jump: 570, baseAtk: 0.95,
    desc: 'Ranged ice mage. Freezes and slows enemies.',
    skills: {
      attack:  { name: 'Ice Projectile', kind: 'projectile', anim: 'attack', dmg: 11, cost: 0, cd: 0.32, element: 'ice', proj: 'ice', speed: 620, slow: 0.6, sfx: 'ice' },
      heavy:   { name: 'Frozen Ground',  kind: 'ground', anim: 'heavy', dmg: 6, cost: 16, cd: 3.5, element: 'ice', width: 240, duration: 4, slow: 0.35, sfx: 'ice' },
      dash:    { name: 'Glacial Step',   kind: 'dashStrike', anim: 'dash', dmg: 6, cost: 6, cd: 0.7, element: 'ice', dist: 180, sfx: 'dash' },
      skill:   { name: 'Ice Nova',       kind: 'nova', anim: 'skill', dmg: 38, cost: 28, cd: 6, radius: 170, element: 'ice', freeze: 1.6, sfx: 'explode' },
      ult:     { name: 'Absolute Zero',  kind: 'nova', anim: 'skill', dmg: 100, cost: 70, cd: 20, radius: 420, element: 'ice', freeze: 3, sfx: 'ult' },
    },
  },
  ryu: {
    name: 'Ryu Kazan', title: 'Blazing Fist', element: 'fire', color: 0xff8a2a,
    speed: 240, jump: 550, baseAtk: 1.12,
    desc: 'Aggressive close-range fighter. Burns everything in his path.',
    skills: {
      attack:  { name: 'Flame Slash',    kind: 'melee', anim: 'attack', dmg: 16, cost: 0, cd: 0.3, range: 80, h: 64, element: 'fire', burn: 2, combo: true, sfx: 'fire' },
      heavy:   { name: 'Fireball',       kind: 'projectile', anim: 'heavy', dmg: 28, cost: 12, cd: 1.1, element: 'fire', proj: 'fireball', speed: 480, burn: 3, explode: 60, sfx: 'fire' },
      dash:    { name: 'Blaze Rush',     kind: 'dashStrike', anim: 'dash', dmg: 14, cost: 6, cd: 0.7, element: 'fire', dist: 200, sfx: 'dash' },
      skill:   { name: 'Fire Explosion', kind: 'nova', anim: 'skill', dmg: 52, cost: 30, cd: 6, radius: 150, element: 'fire', burn: 3, sfx: 'explode' },
      ult:     { name: 'Inferno Dragon', kind: 'beam', anim: 'skill', dmg: 130, cost: 70, cd: 20, length: 600, element: 'fire', burn: 4, sfx: 'ult' },
    },
  },
  elena: {
    name: 'Elena Voss', title: 'Radiant Teacher', element: 'light', color: 0xffe08a,
    speed: 215, jump: 560, baseAtk: 0.9,
    desc: 'Support caster. Light projectiles and powerful healing.',
    skills: {
      attack:  { name: 'Light Projectile', kind: 'projectile', anim: 'attack', dmg: 12, cost: 0, cd: 0.3, element: 'light', proj: 'light', speed: 640, sfx: 'light' },
      heavy:   { name: 'Holy Explosion',   kind: 'nova', anim: 'heavy', dmg: 30, cost: 18, cd: 2.5, radius: 110, element: 'light', sfx: 'explode' },
      dash:    { name: 'Radiant Step',     kind: 'dashStrike', anim: 'dash', dmg: 6, cost: 6, cd: 0.7, element: 'light', dist: 180, sfx: 'dash' },
      skill:   { name: 'Healing Light',    kind: 'heal', anim: 'skill', heal: 0.35, dmg: 20, radius: 120, cost: 30, cd: 9, element: 'light', sfx: 'heal' },
      ult:     { name: 'Divine Judgment',  kind: 'nova', anim: 'skill', dmg: 110, cost: 70, cd: 20, radius: 400, element: 'light', heal: 0.3, sfx: 'ult' },
    },
  },
};

export const CHARACTER_ORDER = ['kai', 'mira', 'ryu', 'elena'];
export const SKILL_SLOTS = ['attack', 'heavy', 'dash', 'skill', 'ult'];
