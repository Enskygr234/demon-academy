// Enemy archetypes. `atlas` enemies use frame animations extracted from the supplied sheets;
// `image` enemies are single supplied designs animated procedurally (bob / squash / lunge tweens).
// ai: 'melee'  - patrols, chases, attacks at close range
//     'caster' - keeps distance and fires projectiles, melee if cornered
//     'flyer'  - hovers, ignores gravity, strafes and shoots
//     'leaper' - crawls, then pounces at the player
//     'charger'- rushes at high speed with dash attack
export const ENEMIES = {
  student: {
    name: 'Corrupted Student', atlas: 'student', ai: 'caster', hp: 46, dmg: 10, speed: 95, xp: 14, gold: 4,
    body: [34, 64], range: 60, shootRange: 380, attackCd: 1.6, proj: 'voidbolt', projDmg: 9, projSpeed: 330,
    anims: { idle: 'idle', move: 'run', attack: 'attack', cast: 'heavy', hurt: 'hurt', death: 'death', jump: 'jump' },
    attackFrame: 3, element: 'void',
  },
  wolf: {
    name: 'Shadow Wolf', atlas: 'wolf', ai: 'charger', hp: 40, dmg: 12, speed: 170, xp: 12, gold: 3,
    body: [80, 48], range: 70, attackCd: 1.3, dashSpeed: 460,
    anims: { idle: 'idle', move: 'run', attack: 'attack', dash: 'dash', hurt: 'hurt', death: 'death', jump: 'jump' },
    attackFrame: 3, element: 'void',
  },
  spirit: {
    name: 'Forest Spirit', atlas: 'spirit', ai: 'caster', hp: 70, dmg: 14, speed: 70, xp: 18, gold: 5,
    body: [56, 92], range: 85, shootRange: 360, attackCd: 2.0, proj: 'leaf', projDmg: 10, projSpeed: 300, spread: 3,
    anims: { idle: 'idle', move: 'run', attack: 'attack', cast: 'heavy', hurt: 'hurt', death: 'death', jump: 'jump' },
    attackFrame: 3, element: 'nature',
  },
  soldier: {
    name: 'Void Soldier', atlas: 'soldier', ai: 'melee', hp: 95, dmg: 18, speed: 85, xp: 26, gold: 8,
    body: [44, 84], range: 80, shootRange: 420, attackCd: 1.7, proj: 'voidball', projDmg: 14, projSpeed: 300, armor: 0.2,
    anims: { idle: 'idle', move: 'walk', attack: 'attack', cast: 'blast', hurt: 'hurt', death: 'death', dash: 'dash' },
    attackFrame: 4, castFrame: 4, element: 'void',
  },
  drone: {
    name: 'Security Drone', image: 'drone', ai: 'flyer', hp: 32, dmg: 8, speed: 110, xp: 12, gold: 4,
    body: [52, 52], shootRange: 420, attackCd: 1.8, proj: 'laser', projDmg: 8, projSpeed: 420, hover: 150, element: 'light',
  },
  experiment: {
    name: 'Failed Experiment', image: 'experiment', ai: 'leaper', hp: 75, dmg: 16, speed: 90, xp: 22, gold: 6,
    body: [60, 70], range: 220, attackCd: 2.0, leap: [420, 420], element: 'void',
  },
};
