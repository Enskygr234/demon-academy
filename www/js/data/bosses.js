// Boss definitions. Bosses are built from the supplied boss designs (overview sheet) and animated
// procedurally. `patterns` are executed by Boss.js; phase 2 triggers at `phase2` HP ratio.
// Pattern types: charge, slam, fan, rain, beam, teleport, summon, spikes, leap, wave, orbs
export const BOSSES = {
  golem: {
    name: 'Training Golem', image: 'guardian', tint: 0x9ab8ff, scale: 0.72, hp: 520, dmg: 16, xp: 160, gold: 60,
    body: [120, 110], speed: 90, music: 'boss1',
    patterns: ['slam', 'charge', 'rain'], phase2: 0.45, phase2Add: ['slam'],
    drop: 'aether_edge', note: 'Placeholder: tinted Ancient Guardian design (no Training Golem art supplied).',
  },
  guardian: {
    name: 'Ancient Guardian', image: 'guardian', scale: 1.0, hp: 900, dmg: 20, xp: 300, gold: 100,
    body: [170, 150], speed: 80, music: 'boss1',
    patterns: ['slam', 'rain', 'charge', 'wave'], phase2: 0.5, phase2Add: ['spikes'],
    drop: 'guardian_plate',
  },
  proto: {
    name: 'Prototype Zero', image: 'proto', scale: 1.0, hp: 1250, dmg: 22, xp: 450, gold: 150,
    body: [150, 150], speed: 110, music: 'boss2',
    patterns: ['beam', 'fan', 'charge', 'leap'], phase2: 0.5, phase2Add: ['orbs'],
    drop: 'lab_chip',
  },
  crimson: {
    name: 'Crimson Knight', image: 'crimson', scale: 1.0, hp: 1600, dmg: 26, xp: 600, gold: 200,
    body: [90, 150], speed: 150, music: 'boss2',
    patterns: ['charge', 'wave', 'leap', 'fan'], phase2: 0.5, phase2Add: ['teleport', 'spikes'],
    drop: 'crimson_fang',
  },
  director: {
    name: 'The Director', image: 'director', scale: 1.05, hp: 2400, dmg: 30, xp: 1200, gold: 500,
    body: [90, 150], speed: 120, music: 'boss3', flying: true,
    patterns: ['orbs', 'teleport', 'spikes', 'summon', 'beam'], phase2: 0.6, phase2Add: ['rain', 'fan'], phase3: 0.25,
    drop: 'void_reaver',
  },
};
