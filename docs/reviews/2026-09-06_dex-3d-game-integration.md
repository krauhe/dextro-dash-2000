# DEX 3D game integration — local trial

Date: 2026-09-06. Checkpoint pushed before implementation: `b4ac2c9`.

## Scope

1. `dex-game-renderer.js` renders the shared workshop model into a transparent 256 × 256 WebGL canvas, then composites it into the existing 2D world. No collision dimensions, jump constants, physiology or pump decisions changed.
2. Game movement selects running, idle, jumping and eating. Physical facing rotates the model instead of mirroring equipment to the opposite cheek. Workshop jump lift is disabled so the game alone controls airborne position. Visual exertion uses simulated gameplay time, including tutorial slow motion.
3. True game BG drives quills/tail, tired eyes and sensor colour/pulses. Equipment and stored charges drive the belly pump/backpack meshes. Mouth-bound food uses a projected mouth-boundary clip; candy approaches that projected mouth rather than the former sprite location.
4. Existing sprite rendering is retained only as a capability fallback if Three.js/WebGL is unavailable or the WebGL context is lost. Existing action particles, death blinking/rotation and overlays remain in the 2D scene.

## Verification

1. All 32 existing gameplay regressions passed after integration. These use the sprite fallback and test mechanics rather than GPU appearance.
2. Shared model regression: 1,260 poses passed before integration; the model itself was not changed for this trial.
3. `tests/dex-game-browser.cjs` exercises real keyboard start, both directions, jumping and stage keys 1–0. Checks actual stage numbers and the active 3D renderer. Controlled BG, stock and eating poses are injected only into the isolated test browser's copy of game.js; there is no public test setter.
4. Screenshots under `tests/playwright/2026-09-06_dex-game/`. Inspected standing feet, airborne pose, opposite cheek, high-BG lowered quills/tail, eating and the backpack. No page errors in the browser regression.

## Limits / follow-up

Update: running now includes volume-preserving torso stretch/squash and a small alternating lean. Jump stretch follows actual vertical velocity. The adapter detects airborne-to-ground transitions and adds a half-second damped landing compression scaled by incoming vertical speed. Equipment compensates for torso scale. These are visual changes only. Model regression and browser integration checks passed; automated assertions cover torso deformation and rigid equipment, but landing feel still needs user playtesting.

1. This is an initial local trial, not a polished character release. The live tail uses the workshop's procedural deformation, not the former 2D spring chain. Running has articulated feet, but no inverse-kinematics ground-contact solver.
2. Death and action effects retain the game's existing 2D presentation; a dedicated 3D injection gesture is not implemented. Food occlusion is a projected 2D mouth clip, not a volumetric food mesh.

   **Eating visibility: FIXED locally (2026-09-06).** The original mouth-only miniature and sprite-pose gate have been replaced by full-size approach, shrink-to-zero intake, held-open mouth and food-coloured pulp. See `2026-09-06_dex-eating.md` for evidence and remaining projected-sprite limitations.
3. Browser smoke tests are not a full ten-stage playthrough or a low-end-device performance benchmark. The model's likeness and size should be reviewed in actual play before publishing this integration.
4. The integration is deliberately uncommitted/unpushed pending user review; the pre-integration workshop checkpoint is already public.
