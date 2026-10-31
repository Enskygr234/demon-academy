// Inventory: consumables, equipment (weapon/armor/accessory) and the academy shop.
import { ITEMS, SHOP } from '../data/items.js';
import { GameState } from '../systems/GameState.js';
import { panel, text, button } from '../ui/widgets.js';
import { Audio } from '../systems/AudioManager.js';

export class InventoryScene extends Phaser.Scene {
  constructor() { super('Inventory'); }
  init(data) { this.from = data.from; this.tab = 'items'; }
  create() {
    const { width: W, height: H } = this.scale;
    this.add.rectangle(0, 0, W, H, 0x05030a, 0.75).setOrigin(0).setInteractive();
    panel(this, 40, 20, W - 80, H - 40);
    text(this, 70, 34, 'INVENTORY', 28, '#ffd0f0', { title: true });
    this.gold = text(this, W - 70, 40, '', 18, '#ffd26a', { ox: 1 });
    this.statsT = text(this, 70, 74, '', 14, '#c8b8ff');
    ['items', 'equipment', 'shop'].forEach((t, i) => button(this, 330 + i * 150, 50, t[0].toUpperCase() + t.slice(1), () => { this.tab = t; this.refresh(); }, { w: 140, h: 36, size: 16 }));
    button(this, W / 2, H - 50, 'Close', () => this.close(), { w: 200, h: 42 });
    this.list = this.add.container(0, 0);
    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.onBack = () => this.close(); this.game.events.on('android-back', this.onBack);
    this.events.once('shutdown', () => this.game.events.off('android-back', this.onBack));
    this.refresh();
  }
  refresh() {
    const { width: W } = this.scale; const d = GameState.data; const st = GameState.getStats();
    this.list.removeAll(true);
    this.gold.setText(`${d.gold} G`);
    this.statsT.setText(`Max HP ${st.maxHp}   Energy ${st.maxEnergy}   ATK ×${st.atk.toFixed(2)}   DEF ${Math.round(st.def * 100)}%   Crit ${Math.round(st.crit * 100)}%   CDR ${Math.round(st.cdr * 100)}%`);
    let rows = [];
    if (this.tab === 'items') rows = Object.keys(ITEMS).filter(id => ITEMS[id].type === 'consumable').map(id => ({ id, right: `×${GameState.count(id)}`, action: 'Use', enabled: GameState.count(id) > 0 }));
    if (this.tab === 'equipment') rows = d.owned.map(id => { const eq = d.equipment[ITEMS[id].type] === id; return { id, right: ITEMS[id].type, action: eq ? 'Equipped' : 'Equip', enabled: !eq }; });
    if (this.tab === 'shop') rows = SHOP.map(id => { const it = ITEMS[id]; const owned = it.type !== 'consumable' && d.owned.includes(id); return { id, right: `${it.price} G`, action: owned ? 'Owned' : 'Buy', enabled: !owned && d.gold >= it.price }; });
    rows.forEach((r, i) => {
      const it = ITEMS[r.id]; const y = 112 + i * 52;
      const g = this.add.graphics().fillStyle(0x24163e, 0.9).fillRoundedRect(70, y, W - 140, 46, 8);
      const icon = this.add.image(96, y + 23, 'prop_' + (it.icon || (it.type === 'weapon' ? 'crystal' : it.type === 'armor' ? 'crate' : 'coin'))).setScale(1.2);
      const name = text(this, 124, y + 5, it.name, 17, '#ffffff');
      const desc = text(this, 124, y + 26, it.desc, 13, '#b8a8d8', { bold: false });
      const right = text(this, W - 260, y + 23, r.right, 15, '#ffd26a', { ox: 1, oy: 0.5 });
      const b = button(this, W - 160, y + 23, r.action, () => this.act(r.id), { w: 140, h: 36, size: 16, disabled: !r.enabled });
      this.list.add([g, icon, name, desc, right, b]);
    });
    if (!rows.length) this.list.add(text(this, W / 2, 200, 'Nothing here yet.', 18, '#a898c8', { ox: 0.5 }));
  }
  act(id) {
    const it = ITEMS[id];
    if (this.tab === 'shop') { if (GameState.buy(id)) Audio.play('coin'); }
    else if (this.tab === 'equipment') { GameState.equip(id); Audio.play('pickup'); }
    else {
      const game = this.scene.get('Game');
      if (this.from === 'Pause' && game?.player) game.useItem(id);
      else if (GameState.consume(id)) { GameState.data.hp = null; Audio.play('heal'); }
    }
    GameState.save(); this.refresh();
  }
  close() { this.scene.stop(); this.scene.resume(this.from); }
}
