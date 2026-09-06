# BG visual workshop and mystery caches

Date: 2026-09-06. Local prototype only; not committed or published.

Visual workshop update: the initial ring layout described below has been superseded by the connected reservoir/column/valve draft. See [the valve check](2026-09-06_bg-valve.md) for current visual behaviour and tests. The recordings, engine and mystery-cache findings below are unchanged.

## Scope

1. `docs/bg-learning.html`, `bg-learning.js` and `bg-learning-data.js`: standalone 3D study of food appearance, true BG, remaining rapid insulin and delayed transport activity. The game HUD is unchanged.
2. `game.js`, `campaign.js`, `docs/level-overview.html`: animated question-mark caches, retained rewards/equipment, and one authored monster cache per stage. Contents are deterministic and limited to the stage roster, never selected from BG or inventory. A revealed monster emerges, hops to supported ground and then uses existing enemy behaviour. A used cache cannot pay out twice.
3. Existing uncommitted 3D integration and animation changes were preserved. Neither vendored physiology file was modified.

## Visual model boundaries

1. Four fixed, fictional recordings start from the same DEX profile and deterministic engine setup: balance, apple, apple plus a game insulin pickup, and apple plus running. No personal inputs, dose controls, treatment timing suggestions or recommendation API.
2. Column height follows true BG. Food appearance, actual liver output and net blood-to-tissue transport are separate fluxes. Background use and renal loss are separate exits. The combined insulin-force total is not used as an outflow: it includes effects that would otherwise be counted twice.
3. The blue ring displays x1 relative to its starting baseline, not all insulin effects, a percentage of active insulin or a dose recommendation. Exercise can change insulin-assisted transport without adding bolus IOB. The reservoir is displayIOB; its disappearance is not tied to glucose particles. The clearance stream uses the rapid plasma component I-Ib, not total insulin above a fixed basal baseline.
4. The food reservoir uses actual D1+D2 gut content in glucose-equivalent grams. Inspection found that the game's time-based COB estimate can reach zero before the model's absorption tail ends. The workshop distinguishes these quantities; the game estimate and engine are not changed.
5. Particle density is bounded, approximate visual encoding, not a mass-conserving particle simulation. The recorded model alone determines BG. This is a design hypothesis, not evidence of learning benefit or clinical validation.

## Verification

1. PASS: `tests/gameplay.test.js`, 33 regression groups, including real underside collisions and one-time monster release/reset on all ten stages.
2. PASS: `tests/level-tools.test.cjs`, all stage schemas, existing roster progression/patrol support, generator determinism and monster-cache roster checks.
3. PASS: `tests/engine-smoke.test.js`, steady true BG 6.000 mmol/L.
4. PASS: `tests/bg-learning.test.cjs`, four deterministic recordings / 2,884 samples, finite values, steady input/output, IOB preceding activity, declining IOB while activity grows, actual absorption tail, exercise signal and interpolation.
5. PASS: `tests/bg-learning-browser.cjs`, isolated Chrome: four scenes, pause, replay, seeking; 1920x1080, 1280x800 and 390x844 layouts; physical cache collision, emergence and landing; no page errors.
6. Visual inspection: readable purple question-mark faces, dim grey used blocks, opaque emerging apple clipped at the opening. Workshop shows falling glucose inside the column and separate blue IOB fill. DEX is beside, not over, the column. On narrow screens secondary labels are hidden and the action label is moved below the BG label.
7. Evidence: `tests/playwright/2026-09-06_bg-learning-caches/`. These are targeted checks, not a complete campaign playthrough or a user-learning study.

## Issues found during implementation

1. FIXED: two proposed cache positions had no full-width landing surface. Positions now pass real head-bump/spawn/ground tests across all ten stages.
2. FIXED: DEX's local pose update overwrote the workshop placement. A parent group now owns scene placement.
3. FIXED: Replay diagnostics could briefly expose the previous sample timestamp. The current playback position now takes precedence.
4. FIXED: mobile clearance text clipped and the action label overlapped BG. Secondary labels now yield to the primary displays.
5. FIXED (test harness): head bumps require the actual playing state; the test now activates it for collision updates. Visual captures wait for the title fade rather than capturing an obstructing intro.

## Remaining limits

1. Artwork and effect intensity are a first draft for user review. The workshop is not embedded in the playable HUD.
2. The fixed examples are exploratory game scenes, not paired clinical experiments or an optimal treatment demonstration.
3. A later integration should test whether players distinguish amount remaining from current activity during actual platform gameplay.
