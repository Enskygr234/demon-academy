// Story dialogue shown before/after each level. speaker -> portrait key in assets/portraits.
export const STORY = {
  intro: [
    { s: 'narrator', t: 'Aetheria. A world where a rare few awaken to Aether — the living energy of creation.' },
    { s: 'narrator', t: 'Astra Academy trains these students. Beneath its halls lies a sealed Void Gate… and the seal is breaking.' },
    { s: 'kai', t: 'Another alarm? That’s the third one tonight. Something is coming up from below the academy.' },
    { s: 'elena', t: 'Kai. Your Void energy is reacting to it. Stay close — the security systems have turned on the students.' },
    { s: 'mira', t: 'Half our class is acting strange. Their eyes… they’re glowing purple.' },
    { s: 'ryu', t: 'Then we knock some sense into them! Let’s move!' },
  ],
  pre1: [{ s: 'elena', t: 'The Training Golem guards the lower courtyard. If it’s been corrupted, you must stop it.' }],
  post1: [
    { s: 'kai', t: 'The Golem was carrying a Void crystal. Someone planted it.' },
    { s: 'mira', t: 'The trail leads into the Forbidden Forest. Nobody goes there after dark…' },
  ],
  pre2: [{ s: 'ryu', t: 'These trees are moving. And the wolves… they’re made of shadow.' }],
  post2: [
    { s: 'elena', t: 'The Ancient Guardian was guarding a hidden elevator. It leads to a lab under the academy.' },
    { s: 'kai', t: 'A lab? The Director never mentioned any lab.' },
  ],
  pre3: [{ s: 'mira', t: 'These tanks… they’re experimenting on students. This is monstrous.' }],
  post3: [
    { s: 'director', t: 'Impressive, Kai Ren. You destroyed my finest prototype. But the Gate is already open.' },
    { s: 'kai', t: 'Director?! You did all of this?' },
    { s: 'director', t: 'Aetheria clings to a broken balance. I will remake it in Void. Come find me — if you can.' },
  ],
  pre4: [{ s: 'ryu', t: 'The city… it’s burning. The Void army broke through the outer walls.' }],
  post4: [
    { s: 'elena', t: 'The Crimson Knight was the Director’s champion. Only the Gate itself remains.' },
    { s: 'kai', t: 'I can feel it calling to me. Aether and Void… maybe I was born to close it.' },
  ],
  pre5: [{ s: 'director', t: 'Welcome to the edge of reality, Kai. Let us see whose will reshapes the world.' }],
  ending: [
    { s: 'kai', t: 'It’s over. The Gate is sealed… with both halves of my power.' },
    { s: 'mira', t: 'You did it, Kai. We all did.' },
    { s: 'elena', t: 'Astra Academy will rebuild. And this time, we’ll be ready.' },
    { s: 'ryu', t: 'So… does this mean we get to skip exams?' },
    { s: 'narrator', t: 'The Void Gate fell silent. But somewhere in the dark, something stirred… THE END?' },
  ],
};

export const SPEAKERS = {
  narrator: { name: '', color: '#c8b8ff' },
  kai: { name: 'Kai Ren', color: '#ff6a7a' },
  mira: { name: 'Mira Yuki', color: '#7ad0ff' },
  ryu: { name: 'Ryu Kazan', color: '#ff9a4a' },
  elena: { name: 'Elena Voss', color: '#ffe08a' },
  director: { name: 'The Director', color: '#c06aff' },
};
