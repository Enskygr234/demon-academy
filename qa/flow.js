// Broad feature test: every level loads, boss fights run, UI scenes open, victory & game over flows.
const { chromium } = require('playwright');
const S = '/home/claude/shots/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push('ERR: ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await p.goto('http://localhost:8080/index.html'); await p.waitForTimeout(3000);
  const ev = (fn, arg) => p.evaluate(fn, arg);
  const shot = n => p.screenshot({ path: S + n + '.png' });
  const startScene = (key, data) => ev(([k, d]) => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(k, d); }, [key, data]);
  const levels = (process.argv[2] || '1,2,3,4,5').split(',').map(Number);
  for (const L of levels) {
    await startScene('Game', { levelId: L }); await p.waitForTimeout(2500);
    await shot(`L${L}_start`);
    // walk a bit through the level with invulnerability, attacking
    await ev(() => { const s = window.__game.scene.getScene('Game'); s.player.invuln = 9999; });
    const info0 = await ev(() => { const s = window.__game.scene.getScene('Game'); return { w: s.built.pixelWidth, enemies: s.enemies.getLength(), arena: s.built.arena }; });
    // teleport midway and screenshot
    await ev(() => { const s = window.__game.scene.getScene('Game'); const x = s.built.pixelWidth * 0.45; const gy = s.groundBelow(x, 0); s.player.setPosition(x, gy - 4); s.player.body.reset(x, gy - 4); });
    await p.waitForTimeout(1500); await p.keyboard.down('j'); await p.waitForTimeout(1200); await p.keyboard.up('j');
    await shot(`L${L}_mid`);
    // go to boss arena
    await ev(() => { const s = window.__game.scene.getScene('Game'); const a = s.built.arena; const x = a.x0 + 200; s.player.setPosition(x, a.floor - 4); s.player.body.reset(x, a.floor - 4); });
    await p.waitForTimeout(3500);
    await shot(`L${L}_boss`);
    await p.keyboard.down('ArrowRight'); for (let i = 0; i < 8; i++) { await p.keyboard.press('j'); await p.waitForTimeout(150); } await p.keyboard.press('k'); await p.keyboard.up('ArrowRight');
    await p.waitForTimeout(2500); await shot(`L${L}_bossfight`);
    const bi = await ev(() => { const s = window.__game.scene.getScene('Game'); const bo = s.boss; return bo ? { hp: bo.hp, max: bo.maxHp, x: bo.x, y: bo.y, phase: bo.phase, pat: bo.lastPattern } : null; });
    // force boss to low hp to see phase 2, then kill
    await ev(() => { const s = window.__game.scene.getScene('Game'); const bo = s.boss; if (bo) bo.takeDamage(bo.maxHp * 0.55, {}); });
    await p.waitForTimeout(3000); await shot(`L${L}_phase2`);
    await ev(() => { const s = window.__game.scene.getScene('Game'); const bo = s.boss; if (bo) bo.takeDamage(bo.maxHp * 2, {}); });
    await p.waitForTimeout(6500); await shot(`L${L}_victory`);
    const sc = await ev(() => window.__game.scene.getScenes(true).map(s => s.scene.key));
    console.log('L' + L, JSON.stringify(info0.arena), 'enemies', info0.enemies, 'boss', JSON.stringify(bi), 'scenes', sc.join(','));
  }
  console.log(errs.slice(0, 40).join('\n') || 'no errors');
  await b.close();
})();
