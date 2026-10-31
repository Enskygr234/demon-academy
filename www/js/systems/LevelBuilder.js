// Parses the level token language (see data/levels.js) into a tile grid + entity placements.
import { ROWS, TILE } from '../config.js';

export const T = { TOP: 0, FILL: 1, PLAT: 2, EDGE_L: 3, EDGE_R: 4, SPIKE: 5, BLOCK: 6, DEEP: 7, EMPTY: -1 };
export const SOLID = [T.TOP, T.FILL, T.EDGE_L, T.EDGE_R, T.BLOCK, T.DEEP];

export function buildLevel(def) {
  const cols = [];           // per column array of tile ids (length ROWS)
  const out = { enemies: [], pickups: [], props: [], checkpoints: [], arena: null, groundAt: [] };
  let h = def.ground;        // ground height in rows from bottom
  const top = () => ROWS - h;
  const newCol = () => new Array(ROWS).fill(T.EMPTY);
  const ensure = n => { while (cols.length < n) cols.push(newCol()); };
  const fillGround = (c, gh) => { const tp = ROWS - gh; for (let r = tp; r < ROWS; r++) cols[c][r] = r === tp ? T.TOP : (r > tp + 1 ? T.DEEP : T.FILL); out.groundAt[c] = tp; };
  let x = 0;
  const tokens = def.layout.trim().split(/\s+/);
  // leading safe area
  ensure(4); for (let c = 0; c < 4; c++) fillGround(c, h); x = 4;
  for (const tok of tokens) {
    let m;
    if ((m = tok.match(/^F(\d+)$/))) { const n = +m[1]; ensure(x + n); for (let i = 0; i < n; i++) fillGround(x + i, h); x += n; }
    else if ((m = tok.match(/^G(\d+)$/))) { const n = +m[1]; ensure(x + n); x += n; }
    else if ((m = tok.match(/^U(\d+)$/))) h += +m[1];
    else if ((m = tok.match(/^D(\d+)$/))) h -= +m[1];
    else if ((m = tok.match(/^S(\d+)$/))) {
      const n = +m[1]; ensure(x + n);
      for (let i = 0; i < n; i++) { fillGround(x + i, h - 1); cols[x + i][ROWS - h] = T.SPIKE; }
      x += n;
    }
    else if ((m = tok.match(/^X(\d+)$/))) {
      const n = +m[1]; ensure(x + n);
      for (let i = 0; i < n; i++) {
        // 3-wide floating platforms separated by 1-tile drops, alternating 1 and 2 rows above ground level
        const k = i % 4; if (k !== 0) { const r = top() - (Math.floor(i / 4) % 2 === 0 ? 1 : 2); cols[x + i][r] = T.PLAT; }
      }
      x += n;
    }
    else if ((m = tok.match(/^([PB])(\d+)@(\d+)$/))) {
      const len = +m[2], ht = +m[3]; ensure(x + len); const r = top() - ht;
      for (let i = 0; i < len; i++) cols[x + i][r] = m[1] === 'P' ? T.PLAT : T.BLOCK;
    }
    else if ((m = tok.match(/^E:(\w+)(?:@(\d+))?$/))) out.enemies.push({ type: m[1], x: x * TILE + 16 + out.enemies.length % 2 * 24, y: (top() - (+m[2] || 0)) * TILE - 4, air: !!m[2] });
    else if ((m = tok.match(/^I:(\w+)$/))) out.pickups.push({ type: m[1], x: x * TILE + 16, y: top() * TILE });
    else if ((m = tok.match(/^O:(\w+)$/))) out.props.push({ key: m[1], x: x * TILE + 16, y: top() * TILE });
    else if (tok === 'C') out.checkpoints.push({ x: x * TILE + 16, y: top() * TILE });
    else if ((m = tok.match(/^BOSS:(\w+)$/))) {
      const n = 30; ensure(x + n + 2);
      for (let i = 0; i < n + 2; i++) fillGround(x + i, h);
      out.arena = { key: m[1], x0: x * TILE, x1: (x + n) * TILE, floor: top() * TILE, gateCol: x };
      for (let r = 0; r < ROWS; r++) { cols[x + n][r] = r >= top() ? cols[x + n][r] : T.BLOCK; cols[x + n + 1][r] = r >= top() ? cols[x + n + 1][r] : T.BLOCK; }
      x += n + 2;
    }
    else console.warn('Unknown level token', tok);
  }
  // edges
  for (let c = 0; c < cols.length; c++) {
    const tp = cols[c].findIndex(v => v === T.TOP); if (tp < 0) continue;
    const lt = c > 0 ? cols[c - 1].findIndex(v => SOLID.includes(v)) : tp;
    const rt = c < cols.length - 1 ? cols[c + 1].findIndex(v => SOLID.includes(v)) : tp;
    if (lt < 0 || lt > tp) cols[c][tp] = T.EDGE_L;
    else if (rt < 0 || rt > tp) cols[c][tp] = T.EDGE_R;
  }
  const width = cols.length;
  const data = []; for (let r = 0; r < ROWS; r++) data.push(cols.map(col => col[r]));
  return Object.assign(out, { width, data, pixelWidth: width * TILE, pixelHeight: ROWS * TILE });
}
