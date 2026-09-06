# Egg Man — rolling and platform collision correction

Date: 2026-09-06. Local changes only; not committed or pushed.

## 1. Rotation and feet — FIXED locally

The whole sprite previously rotated around the bottom-centred walking pivot. The feet rotated with it, making the shell orbit a point below the body.

The drop-egg renderer now separates the existing image into shell and two legs. Legs rotate inward and retract behind the shell during the end of the warning. The shell rotates around its own centre. Its sampled outline also determines the vertical contact offset at each rotation, avoiding an orbit or a gap beneath a sideways egg. Rotation follows horizontal distance. After rolling, the shell settles upright and feet unfold.

The source PNG is unchanged. This remains a cutout animation, not a new volumetric egg model.

## 2. Falling through platforms — FIXED locally

The old fall checked only the level's global `groundY`, ignoring raised platforms, and rolling ignored gaps.

The egg now rolls off its starting perch rather than falling through it. Small physics steps check crossed platform/cache tops, select the first surface, and stop vertical motion there. Collapsed platforms are excluded. Solid sides reverse horizontal direction. A genuine gap still permits falling; there is no invisible global floor below it. Offscreen fallen eggs are removed from active enemies.

The existing warning duration and dangerous rolling/falling contact remain. Rolling duration counts supported rolling time; flight does not reset or consume that timer. No food macros, physiology, pump logic or level geometry changed.

## 3. Verification

1. `tests/gameplay.test.js`: all 37 regression checks pass. Egg tests cover warning/tucking, perch support, edge departure, landing, dangerous contact, return to rest, rotation-to-travel relationship, shell contact height and real holes.
2. Collision tests run at 10, 30, 60 and 120 FPS in both directions. A deliberately fast 2,200-unit/second fall is caught by a one-unit-thick raised floor. Tests also cover unsorted stacked floors, collapsed support, cache tops and narrow solid walls.
3. `tests/egg-browser.cjs`: both directions across ten animation times, from warning through tuck/roll/fall/landing to feet extended again. No page errors. Screenshots: `tests/playwright/2026-09-06_egg-roll/`.
4. Visual inspection caught a small hovering gap with the initial elliptical contact approximation; the final renderer uses the same shell outline for clipping and contact height. Final screenshots show retracted feet and supported shell rolling on the perch and lower ground.
5. `git diff --check`: passed. Browser checks are targeted animation tests, not a complete campaign playthrough.

Summary: both reported issues fixed locally. No remaining blocker found in the targeted checks.
