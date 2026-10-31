// Persistent RPG state: level/XP, stats, skills, inventory, equipment, missions, save/load.
import { SAVE_KEY, SETTINGS_KEY } from '../config.js';
import { ITEMS } from '../data/items.js';
import { CHARACTER_ORDER, SKILL_SLOTS } from '../data/characters.js';
import { LEVELS } from '../data/levels.js';

const MAX_SKILL = 3;
const MAX_PASSIVE = 5;
export const PASSIVES = {
  vitality: { name: 'Vitality', desc: '+20 max HP per rank' },
  focus: { name: 'Focus', desc: '+15 max energy per rank' },
  might: { name: 'Might', desc: '+8% damage per rank' },
  guard: { name: 'Guard', desc: '+5% damage reduction per rank' },
  swift: { name: 'Swiftness', desc: '+4% move speed, -4% cooldowns per rank' },
};

function defaults() {
  const skills = {};
  for (const c of CHARACTER_ORDER) skills[c] = Object.fromEntries(SKILL_SLOTS.map(s => [s, s === 'ult' ? 0 : 1]));
  return {
    version: 1, level: 1, xp: 0, gold: 0, skillPoints: 1,
    hp: null, energy: null, active: 'kai',
    skills, passives: { vitality: 0, focus: 0, might: 0, guard: 0, swift: 0 },
    inventory: { potion: 3, ether: 2 },
    owned: ['training_blade', 'uniform'],
    equipment: { weapon: 'training_blade', armor: 'uniform', accessory: null },
    unlocked: 1, completed: [], currentLevel: 1, checkpoint: null,
    missions: {}, totals: { kills: 0, deaths: 0, playTime: 0, bosses: 0 }, seen: {},
  };
}

class GameStateClass {
  constructor() { this.data = defaults(); this.settings = this.loadSettings(); this.listeners = new Set(); }

  // ----- persistence
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  newGame() { this.data = defaults(); this.save(); }
  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); return true; } catch (e) { console.warn('save failed', e); return false; }
  }
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      const d = JSON.parse(raw); const base = defaults();
      this.data = Object.assign(base, d, { skills: Object.assign(base.skills, d.skills || {}), passives: Object.assign(base.passives, d.passives || {}) });
      return true;
    } catch (e) { console.warn('load failed', e); return false; }
  }
  wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} this.data = defaults(); }
  loadSettings() {
    const def = { music: 0.5, sfx: 0.8, touch: 'auto', shake: true, damageNumbers: true, joystick: 'stick' };
    try { return Object.assign(def, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { return def; }
  }
  saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch (e) {} }

  // ----- events
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, payload) { for (const fn of this.listeners) fn(type, payload); }

  // ----- stats
  xpToNext(lvl = this.data.level) { return Math.floor(60 * Math.pow(lvl, 1.5)); }
  getStats() {
    const d = this.data, p = d.passives;
    const eq = Object.values(d.equipment).filter(Boolean).map(id => ITEMS[id] || {});
    const sum = k => eq.reduce((a, it) => a + (it[k] || 0), 0);
    return {
      maxHp: Math.round(100 + (d.level - 1) * 14 + p.vitality * 20 + sum('hp')),
      maxEnergy: Math.round(100 + p.focus * 15 + sum('energy')),
      atk: 1 + (d.level - 1) * 0.07 + p.might * 0.08 + sum('atk'),
      def: Math.min(0.7, p.guard * 0.05 + sum('def')),
      crit: 0.05 + sum('crit'),
      cdr: Math.min(0.5, sum('cdr') + p.swift * 0.04),
      regen: 7 * (1 + sum('regen')),
      speed: 1 + p.swift * 0.04 + sum('speed'),
    };
  }
  skillLevel(char, slot) { return this.data.skills[char]?.[slot] ?? 0; }
  skillMult(char, slot) { const l = this.skillLevel(char, slot); return 1 + 0.25 * Math.max(0, l - 1); }
  skillCdMult(char, slot) { const l = this.skillLevel(char, slot); return (1 - 0.08 * Math.max(0, l - 1)) * (1 - this.getStats().cdr); }

  addXp(n) {
    const d = this.data; d.xp += n; let gained = 0;
    while (d.xp >= this.xpToNext()) { d.xp -= this.xpToNext(); d.level++; d.skillPoints += 1; gained++; }
    if (gained) this.emit('levelup', d.level);
    return gained;
  }
  addGold(n) { this.data.gold += n; }

  upgradeSkill(char, slot) {
    const d = this.data; const cur = this.skillLevel(char, slot);
    if (d.skillPoints < 1 || cur >= MAX_SKILL) return false;
    d.skills[char][slot] = cur + 1; d.skillPoints--; this.save(); return true;
  }
  upgradePassive(key) {
    const d = this.data;
    if (d.skillPoints < 1 || d.passives[key] >= MAX_PASSIVE) return false;
    d.passives[key]++; d.skillPoints--; this.save(); return true;
  }
  get maxSkill() { return MAX_SKILL; }
  get maxPassive() { return MAX_PASSIVE; }

  // ----- inventory
  addItem(id, qty = 1) {
    const it = ITEMS[id]; if (!it) return;
    if (it.type === 'consumable') this.data.inventory[id] = (this.data.inventory[id] || 0) + qty;
    else if (!this.data.owned.includes(id)) this.data.owned.push(id);
    this.emit('item', id);
  }
  count(id) { return this.data.inventory[id] || 0; }
  consume(id) { if (!this.count(id)) return false; this.data.inventory[id]--; return true; }
  equip(id) {
    const it = ITEMS[id]; if (!it || !this.data.owned.includes(id)) return false;
    this.data.equipment[it.type] = id; this.save(); this.emit('equip', id); return true;
  }
  buy(id) {
    const it = ITEMS[id]; if (!it || !it.price || this.data.gold < it.price) return false;
    if (it.type !== 'consumable' && this.data.owned.includes(id)) return false;
    this.data.gold -= it.price; this.addItem(id); this.save(); return true;
  }

  // ----- missions & progression
  mission(levelId) {
    const m = this.data.missions; if (!m[levelId]) m[levelId] = { kills: 0, chests: 0, sideDone: false, mainDone: false };
    return m[levelId];
  }
  trackKill(levelId) {
    const m = this.mission(levelId); m.kills++; this.data.totals.kills++;
    this._checkSide(levelId);
  }
  trackChest(levelId) { const m = this.mission(levelId); m.chests++; this._checkSide(levelId); }
  _checkSide(levelId) {
    const lv = LEVELS.find(l => l.id === levelId); const m = this.mission(levelId); const side = lv.mission.side;
    const v = side.type === 'kills' ? m.kills : m.chests;
    if (!m.sideDone && v >= side.target) { m.sideDone = true; this.addXp(80 * levelId); this.addGold(50 * levelId); this.emit('mission', side.text); }
  }
  completeLevel(levelId) {
    const d = this.data; const m = this.mission(levelId); m.mainDone = true;
    if (!d.completed.includes(levelId)) d.completed.push(levelId);
    d.unlocked = Math.max(d.unlocked, Math.min(LEVELS.length, levelId + 1));
    d.checkpoint = null; d.currentLevel = Math.min(LEVELS.length, levelId + 1);
    this.save();
  }
}

export const GameState = new GameStateClass();
