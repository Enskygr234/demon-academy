// Level layouts in a compact token language parsed by systems/LevelBuilder.js.
//   F<n>        flat ground for n tiles             G<n>   bottomless gap n tiles
//   U<n>/D<n>   raise / lower ground by n rows      S<n>   spike floor n tiles
//   X<n>        gap of n tiles bridged by floating one-way platforms
//   P<len>@<h>  one-way platform, h rows above ground at the cursor (does not advance)
//   B<len>@<h>  solid block platform (does not advance)
//   E:<type>[@h] enemy at cursor (h rows above ground)   I:<hp|mp|coin|chest> pickup
//   O:<prop>    decoration prop      C  checkpoint      BOSS:<key>  boss arena (ends the level)
export const LEVELS = [
  {
    id: 1, key: 'academy', name: 'Astra Academy', subtitle: 'Corridors of the Awakened',
    music: 'academy', enemies: ['student', 'drone'], boss: 'golem', ground: 4,
    mission: { main: 'Defeat the Training Golem', side: { type: 'kills', target: 12, text: 'Defeat 12 intruders' } },
    foreground: ['banner'],
    layout: `
      O:lamp F6 O:banner F4 I:coin F3 O:bookshelf F5 E:student F6 O:lamp F4
      P4@3 F2 I:coin F6 E:student F4 O:banner F4 U1 F6 E:drone@4 F6 D1 F4 C F4
      O:bookshelf F3 E:student F5 G3 F4 O:lamp F2 P3@3 F3 P3@5 I:chest F6 E:student E:drone@5 F8
      U2 F8 E:student F4 D2 F4 S3 F5 O:lamp F2 C F6
      X8 F4 E:drone@4 F5 O:banner F3 E:student F4 P5@4 F3 E:student@4 F6 I:hp F6 U1 F5 E:drone@5 F4 D1 F6 C F6
      O:lamp BOSS:golem`,
  },
  {
    id: 2, key: 'forest', name: 'Forbidden Forest', subtitle: 'Where the Ancient Trees Whisper',
    music: 'forest', enemies: ['spirit', 'wolf'], boss: 'guardian', ground: 4,
    mission: { main: 'Defeat the Ancient Guardian', side: { type: 'chests', target: 3, text: 'Find 3 hidden caches' } },
    foreground: ['bush', 'mushroom'],
    layout: `
      O:bush F6 O:mushroom F4 E:wolf F6 I:coin F4 P3@3 F2 P3@6 I:chest F5 E:spirit F6 O:bush F4
      G3 F5 E:wolf F4 U2 F5 O:mushroom F4 D1 F4 E:spirit F5 C F4
      X9 F4 E:wolf E:wolf F6 O:bush F3 P4@3 F4 E:spirit@3 F5 S2 F4 U1 F5 I:hp F3 D2 F5
      B3@3 F2 B3@6 I:chest F6 E:spirit F5 C F4 G4 F4 E:wolf F5 E:wolf F4 O:mushroom F3
      U2 F5 E:spirit F4 X7 F3 P3@4 I:chest F4 E:wolf F4 D2 F6 I:mp F4 C F6
      O:bush BOSS:guardian`,
  },
  {
    id: 3, key: 'lab', name: 'Underground Lab', subtitle: 'Project: Void Vessel',
    music: 'lab', enemies: ['drone', 'experiment', 'student'], boss: 'proto', ground: 4,
    mission: { main: 'Shut down Prototype Zero', side: { type: 'kills', target: 15, text: 'Destroy 15 lab hostiles' } },
    foreground: ['tank'],
    layout: `
      O:console F5 O:tank F4 E:drone@4 F6 O:tank F4 E:experiment F6 I:coin F3 S3 F5 E:drone@5 F4 C F4
      P4@3 F2 P4@6 F4 I:chest F4 E:student F5 O:console F3 G3 F4 E:experiment F6 U1 F4 E:drone@4 F5
      D1 X8 F4 O:tank F3 E:experiment E:drone@5 F6 I:hp F4 C F4 S4 F4 B3@3 F3 E:student F5
      U2 F5 E:experiment F4 E:drone@3 F5 D2 F5 O:console F3 E:student F5 E:drone@5 F5 I:mp F4 C F6
      O:tank BOSS:proto`,
  },
  {
    id: 4, key: 'city', name: 'Broken City', subtitle: 'The Night Aetheria Fell',
    music: 'city', enemies: ['soldier', 'wolf', 'drone'], boss: 'crimson', ground: 4,
    mission: { main: 'Defeat the Crimson Knight', side: { type: 'kills', target: 18, text: 'Defeat 18 Void forces' } },
    foreground: ['carwreck', 'fire'],
    layout: `
      O:carwreck F6 O:fire F4 E:soldier F6 I:coin F4 E:wolf F5 G3 F4 O:fire F3 E:drone@4 F5 U2 F5 E:soldier F5 C F4
      D2 O:carwreck F4 X8 F4 E:wolf E:wolf F6 P4@3 F3 P4@6 I:chest F5 E:soldier F6 S3 F4 I:hp F4 C F4
      U1 F5 E:drone@4 F4 E:soldier F5 O:fire F3 D1 G4 F4 E:wolf F4 E:soldier F6 B3@4 F3 I:mp F4
      E:drone@5 F5 E:soldier F5 X7 F4 E:wolf F4 E:soldier F5 O:carwreck F4 I:hp F3 C F6
      O:fire BOSS:crimson`,
  },
  {
    id: 5, key: 'void', name: 'The Void Gate', subtitle: 'Beyond the Edge of Reality',
    music: 'void', enemies: ['experiment', 'soldier', 'student', 'wolf'], boss: 'director', ground: 4,
    mission: { main: 'Defeat The Director and seal the Gate', side: { type: 'kills', target: 20, text: 'Purge 20 Void spawn' } },
    foreground: ['crystal'],
    layout: `
      O:crystal F6 E:student F5 I:coin F4 X8 F4 E:experiment F5 O:crystal F3 E:wolf F5 C F4
      U2 F4 E:soldier F5 X9 F4 E:student E:wolf F5 P3@3 F2 P3@6 I:chest F6 D2 S4 F4 E:experiment F5 I:hp F4 C F4
      X10 F4 E:soldier F4 E:experiment F5 U1 F4 E:student F4 E:wolf F5 B3@4 F3 I:mp F4 D1 F4
      E:soldier F5 E:soldier F4 X8 F4 E:experiment F4 E:wolf E:wolf F5 I:hp F4 C F6
      O:crystal BOSS:director`,
  },
];
