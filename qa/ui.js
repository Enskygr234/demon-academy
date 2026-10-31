const { chromium } = require('playwright');
const S = '/home/claude/shots/ui_';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, hasTouch: true, isMobile: false });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack||'').split('\n')[1])); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:8080/index.html'); await p.waitForTimeout(3000);
  const tap = async (x, y, w = 300) => { await p.mouse.click(x, y); await p.waitForTimeout(w); };
  // New game -> story intro
  await tap(770, 270, 1200); await p.screenshot({ path: S + '1_story.png' });
  for (let i = 0; i < 14; i++) await tap(480, 300, 120);
  await p.waitForTimeout(800); await p.screenshot({ path: S + '2_charselect.png' });
  await tap(480 + 100, 200, 600); await p.screenshot({ path: S + '3_charselect_mira.png' });
  await tap(830, 510, 1200);  // start -> pre1 story
  for (let i = 0; i < 25; i++) { const on = await p.evaluate(() => window.__game.scene.isActive('Game')); if (on) break; console.log(i, await p.evaluate(() => window.__game.scene.getScenes(true).map(s=>s.scene.key).join())); await tap(480, 300, 400); } await p.waitForTimeout(2500);
  await p.screenshot({ path: S + '4_game_touch.png' });
  // touch control: hold joystick right + attack
  await p.evaluate(() => { const ui = window.__game.scene.getScene('UI'); return ui.touchOn; }).then(v => console.log('touchOn', v));
  // pause via button
  await tap(924, 36, 800); await p.screenshot({ path: S + '5_pause.png' });
  await tap(480, 160 + 52, 800); await p.screenshot({ path: S + '6_inventory.png' });
  await tap(630, 50, 500); await p.screenshot({ path: S + '7_equipment.png' });
  await tap(780, 50, 500); await p.screenshot({ path: S + '8_shop.png' });
  await tap(480, 490, 600);
  await tap(480, 160 + 104, 800); await p.screenshot({ path: S + '9_skilltree.png' });
  await tap(480, 496, 600);
  await tap(480, 160 + 156, 800); await p.screenshot({ path: S + '10_settings.png' });
  await tap(480, 445, 600);
  await tap(480, 160, 800); // resume
  // kill player for game over
  await p.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.lives = 1; s.player.invuln = 0; s.player.takeDamage(99999, s.player.x); });
  await p.waitForTimeout(4500); await p.screenshot({ path: S + '11_gameover.png' });
  await tap(480, 313 + 62, 1500); await p.screenshot({ path: S + '12_levelselect.png' });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
