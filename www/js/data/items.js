// Items, equipment and weapons. Stats are additive bonuses applied by GameState.getStats().
export const ITEMS = {
  // consumables
  potion:   { name: 'Aether Potion', type: 'consumable', icon: 'orb_hp', desc: 'Restores 40% HP.', heal: 0.4, price: 30 },
  ether:    { name: 'Void Ether', type: 'consumable', icon: 'orb_mp', desc: 'Restores 50% energy.', energy: 0.5, price: 30 },
  elixir:   { name: 'Academy Elixir', type: 'consumable', icon: 'chest', desc: 'Fully restores HP and energy.', heal: 1, energy: 1, price: 120 },
  // weapons
  training_blade: { name: 'Training Blade', type: 'weapon', desc: 'Standard academy issue.', atk: 0 },
  aether_edge:    { name: 'Aether Edge', type: 'weapon', desc: 'Hums with Aether. ATK +15%.', atk: 0.15, price: 250 },
  crimson_fang:   { name: 'Crimson Fang', type: 'weapon', desc: "The Knight's blade. ATK +30%, crit +5%.", atk: 0.3, crit: 0.05 },
  void_reaver:    { name: 'Void Reaver', type: 'weapon', desc: 'Forged from the Gate. ATK +50%.', atk: 0.5, crit: 0.08 },
  // armor
  uniform:        { name: 'Academy Uniform', type: 'armor', desc: 'Basic protection.', def: 0 },
  guardian_plate: { name: 'Guardian Plate', type: 'armor', desc: 'Ancient stone armor. DEF +20%, HP +40.', def: 0.2, hp: 40 },
  shadow_coat:    { name: 'Shadow Coat', type: 'armor', desc: 'Light and dark. DEF +12%, speed +8%.', def: 0.12, speed: 0.08, price: 300 },
  // accessories
  spirit_charm:   { name: 'Spirit Charm', type: 'accessory', desc: 'Energy regen +60%.', regen: 0.6, price: 200 },
  lab_chip:       { name: 'Overclock Chip', type: 'accessory', desc: 'Skill cooldowns -20%.', cdr: 0.2 },
  ember_ring:     { name: 'Ember Ring', type: 'accessory', desc: 'Max energy +30, crit +5%.', energy: 30, crit: 0.05, price: 220 },
};

export const SHOP = ['potion', 'ether', 'elixir', 'aether_edge', 'shadow_coat', 'spirit_charm', 'ember_ring'];

// Random drop table for normal enemies
export const DROPS = [
  { id: 'potion', chance: 0.08 },
  { id: 'ether', chance: 0.06 },
];
