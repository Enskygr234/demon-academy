// Autopilot traversal test: a simple bot runs right, jumps gaps/walls, attacks. Reports progress per level.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack||'').split('\n').slice(1,3).join('|')));
  await p.goto('http://localhost:8080/index.html'); await p.waitForTimeout(2500);
  const invuln = process.argv[3] === 'god';
  for (const L of (process.argv[2] || '1').split(',').map(Number)) {
    await p.evaluate(L => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Game', { levelId: L }); }, L);
    await p.waitForTimeout(2500);
    await p.evaluate((god) => {
      const s = window.__game.scene.getScene('Game'); const pl = s.player; const t = s.inputMgr.touch;
      window.__bot = { log: [], stuck: 0, lastX: 0, pits: 0 };
      const origPit = s.pitFall.bind(s); s.pitFall = () => { window.__bot.pits++; origPit(); };
      window.__botTimer = setInterval(() => {
        if (!pl.active) return;
        if (god) pl.invuln = 5;
        const onG = pl.body.blocked.down;
        const ahead = s.isSolidAt(pl.x + 50, pl.y + 10) || s.isSolidAt(pl.x + 90, pl.y + 10);
        const wall = pl.body.blocked.right || s.isSolidAt(pl.x + 30, pl.y - 20);
        const enemyNear = s.enemies.getChildren().some(e => e.active && e.state !== 'dead' && Math.abs(e.x - pl.x) < 140 && Math.abs(e.y - pl.y) < 100) || (s.boss && !s.boss.dead && Math.abs(s.boss.x - pl.x) < 220);
        t.x = 1;
        t.attack = enemyNear ? !t.attack : false;
        t.heavy = enemyNear && Math.random() < 0.1;
        t.skill = enemyNear && Math.random() < 0.05;
        const hold = (window.__bot.hold || 0) > 0; window.__bot.hold = Math.max(0, (window.__bot.hold || 0) - 1);
        t.jump = hold;
        if (onG && (!ahead || wall)) { t.jump = true; window.__bot.hold = 4; }
        else if (!onG && pl.body.velocity.y > 50 && !s.isSolidAt(pl.x + 30, pl.y + 120) && pl.jumps < 2) { t.jump = !t.jump; window.__bot.hold = 3; }
        if (Math.abs(pl.x - window.__bot.lastX) < 4) window.__bot.stuck++; else window.__bot.stuck = 0;
        if (window.__bot.stuck > 15 && onG) t.jump = true;
        window.__bot.lastX = pl.x;
      }, 90);
    }, invuln);
    const t0 = Date.now(); let last;
    while (Date.now() - t0 < 150000) {
      await p.waitForTimeout(5000);
      last = await p.evaluate(() => { const s = window.__game.scene.getScene('Game'); if (!s || !s.player) return { gone: true, scenes: window.__game.scene.getScenes(true).map(x => x.scene.key) }; return { x: s.player.x | 0, w: s.built.pixelWidth, hp: s.player.hp | 0, lives: s.lives, pits: window.__bot.pits, boss: s.bossTriggered, kills: s.enemies.getChildren().filter(e => e.state === 'dead').length, lvl: window.__GS?.data?.level, scenes: window.__game.scene.getScenes(true).map(x => x.scene.key).join() }; });
      if (last.gone || last.boss || !last.scenes.includes('Game')) break;
    }
    await p.evaluate(() => clearInterval(window.__botTimer));
    console.log('L' + L, JSON.stringify(last), 'secs', ((Date.now() - t0) / 1000) | 0);
    await p.screenshot({ path: `/home/claude/shots/bot_L${L}.png` });
  }
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
