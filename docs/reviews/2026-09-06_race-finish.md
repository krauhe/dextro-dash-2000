# Race finish visual check

Date: 2026-09-06. Scope: replace the finish hut with a race gantry; no gameplay or physiology changes.

1. **FIXED:** `game.js` now draws an open gantry with grounded metal posts, checker patterns, a subtly moving FINISH banner and a small checkered finish stripe. Drawing stays behind DEX and adds no collision geometry.
2. **PASS:** All 37 gameplay regression checks pass. The targeted Chrome test checks all ten stages immediately before and exactly at their unchanged `finishX`: play continues before it and bonus counting begins at it.
3. **PASS:** Screenshots rendered in five themes and at 1920x1080, 1280x800 and 375x667. The orchard and volcano screenshots were visually inspected: the whole banner is visible, has clear lettering and does not overlap the glucose HUD. Both posts meet the ground. Three animation samples rendered without errors.
4. **LIMITATION:** The existing portrait mobile layout scales the entire keyboard game down substantially. The gantry fits, but this check does not establish comfortable mobile playability. No responsive redesign was in scope.
5. **PASS:** No browser page errors. No public test setters were added; controlled stage positioning exists only in the intercepted test response. No commit or push performed.

Evidence: `tests/finish-browser.cjs`; screenshots in `tests/playwright/2026-09-06_race-finish/` (ignored local output), especially `stage-1.png`, `stage-7.png`, `viewport-1280.png` and `viewport-375.png`.
