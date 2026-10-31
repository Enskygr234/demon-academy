# Automated QA (Playwright)

Serve `www/` on port 8080, then:
* `node flow.js 1,2,3,4,5` – loads every level, runs boss fights incl. phase change and victory, screenshots each stage.
* `node ui.js` – drives menus by touch: new game → story → character select → HUD/touch controls → pause → inventory/shop → skill tree → settings → game over → mission select.
* `node bot.js 1,2 god` – autopilot traversal bot (runs, jumps gaps, fights) to verify level geometry is completable.
