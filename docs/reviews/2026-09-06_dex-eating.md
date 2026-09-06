# DEX eating animation — local visual correction

Date: 2026-09-06. No commit or push performed.

## Finding and correction

**WARNING — Food disappeared before visibly entering the mouth.**

The game hid the enemy at contact, then drew an already miniature image in the mouth. A check against three sprite-pose names also gated the 3D drawing. The old shrinking image never reached zero size, and the automatic 3D mouth closed before consumption finished.

**Status: FIXED locally (2026-09-06).**

1. A 0.66-second trajectory starts at the enemy's actual sprite centre and full 31-unit size. Smooth interpolation follows DEX's projected mouth and shrinks to zero, followed by brief chewing. DEX's existing movement slowdown is retained.
2. Food is visible outside the front lip and inside the projected mouth opening. It is clipped away over cheeks and eyes. Each currently consumed enemy is drawn, not only the first one.
3. The mouth stays open during intake. The sprite fallback uses open-mouth frames during the same intake period.
4. Small stylised food particles appear at contact and once near the mouth during the gulp. Colours describe the interior: cream apple, pale yellow banana, light green avocado, egg white/yolk, cake crumb, burger filling, pizza cheese and orange soda. Particles expire; they do not represent glucose flux.
5. No nutrition, score, physiological equation, pump controller or collision rule was changed. Food registration remains a single event at contact, not at particle emission.

## Verification

1. `tests/gameplay.test.js`: all 34 checks pass, including monotonically decreasing sprite size, exact zero endpoint, both directions, a single food registration, exactly one delayed pulp burst, and particle expiry.
2. `tests/dex-3d.test.cjs`: 1,260 model poses pass. The shared 3D geometry was not changed by this correction.
3. `tests/dex-eating-browser.cjs`: real side-contact dispatch, four foods, both directions and six intake phases in headless Chrome. Also checks the loaded-image sprite fallback in both directions. No page errors. Screenshots: `tests/playwright/2026-09-06_dex-eating/`.
4. Inspected apple and pizza approach, apple and banana entry, avocado pulp, and sprite fallback. The screenshot fixture initially placed enemies eight units above ground; its input now respects `createEnemy`'s level-coordinate conversion. Resetting the tail after fixture teleport avoids a test-only detached-tail image.
5. `git diff --check`: no whitespace errors. Existing Three.js build deprecation warning remains unrelated.

## Scope and limits

The food is still a 2D sprite entering a projected 3D mouth, not a volumetric food mesh. The test verifies sequence and clipping, not subjective animation feel or a complete level playthrough. The BG-column/insulin-valve idea was discussed but not changed in this correction.
