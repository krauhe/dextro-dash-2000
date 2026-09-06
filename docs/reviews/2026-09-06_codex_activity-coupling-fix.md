# DEX movement, physiological activity and recovery breathing

Date: 2026-09-06. Scoped implementation review and decision record, not a full physiological or clinical validation.

## 1. Background and decision

The user requested that actual DEX movement drive the imported physiology model: ordinary running should use moderate cardio, and future super shoes should use high cardio. A subsequent request connected standing/panting animation to elevated physiological heart rate.

Previously, running affected animation only. No activity API was called from `game.js`. The shared 3D workshop accumulated visual effort from time spent running, independently of the physiology engine.

The implemented mapping uses the existing cardio catalogue without changing its parameters. It does **not** implement the earlier speculative 2x contraction multiplier. High cardio means the engine's `Høj` preset, not a maximum-human-effort claim or a guarantee of a larger glucose fall in every situation.

Super-shoe pickup, art, placement, movement boosts and gravity changes are **not implemented** here. `player.superShoesActive` is a false-by-default internal equipment hook, tested for the eventual integration. No public personal-physiology configuration or advice is added.

## 2. Diagnosis and evidence chain

| Mechanism | Evidence/target | Existing implementation | Classification and verification |
| --- | --- | --- | --- |
| Muscle contraction uptake | Distinct working-muscle uptake, not an arbitrary BG decrement; existing upstream implementation documentation, activity section | `exerciseInput = max(0,(HR-HRbase)/HRbase) * contractionUptakeScaling`; `dE1/dt=(input-E1)/5`; `dQ2/dt` contains `-beta*E1` once | Existing adapted model. Controller output exactly equals calling the engine API directly. Setting beta=0 in the isolated test removes its separate BG contribution. |
| Intensity response | Shetty et al. (2021): nine young adults with T1D under a hyperinsulinaemic clamp; glucose-infusion increments increased from 35% to 65% peak oxygen uptake and plateaued between 65% and 80% | Existing cardio HR targets 130 and 160 bpm; independent uptake, sensitivity and hepatic-drive parameters | Preset mapping is a fictional game convention, not calibrated in this task to those percentages. No new clinical endpoint assertion. High > medium BG lowering tested only in fixed DEX protocol. |
| SC insulin absorption | Koivisto and Felig (1978): leg exercise accelerated disappearance of injected soluble insulin from the leg, not the arm; strong site dependence | `_substepRapidInsulin`: `pulseFactor=1+0.5*max(0,(HR-HRbase)/HRbase)` multiplies both depot transfer rates | Existing heuristic; not universal across injection sites or insulin formulations. Isolated rapid-perfusion ablation recovers the resting rapid-depot trajectory while preserving muscle activity. |
| Recovery | Activity removal changes the stimulus, not the existing ODE states | `stopActivity()` freezes exposure duration; HR and E1 decay; sensitivity sessions remain | Exact state continuity at stop, nonzero E1 after stop, and immediate restart tested. |
| Breathing feedback | User's visual requirement: standing DEX continues panting while HR is high | `breathingEffort=clamp((HR-HRbase)/(160-HRbase),0,1)`; phase integrated continuously | Visual convention only, not a respiratory model. Uses actual model HR rather than run duration. |

Units: `game.js` converts seconds of advancing gameplay to minutes using the existing factor **4 simulated minutes per game second**. HR is bpm; E1 and pulseFactor are dimensionless; beta is mmol/min (0.78 at fixed DEX weight 70 kg); depot insulin is mU internally. The controller never writes BG, insulin pools, E1, sensitivity, HR or physiological rate constants.

The upstream documentation's own limitations remain: its heart-rate absorption rule is a simplification, and its published activity checks do not validate absolute clamp calibration or individual responses. This change does not resolve or conceal those limitations.

## 3. Integration and lifecycle

1. `updatePlayer()` measures actual horizontal displacement **after** resolving walls. Active directed motion or upward jumping marks exertion. Holding a key against a wall, standing still and passive falling do not mark exertion. A moving jump remains active; high-BG reduced-speed running still counts as medium cardio.
2. `DexActivity.update()` calls the engine's `startActivity()` once per continuous bout. On rest or equipment intensity change, it uses `stopActivity()`. It does not create a session every frame or manually add glucose disposal.
3. Existing cardiovascular/ODE states remain continuous across stop and intensity changes. Repeated bouts create distinct nonoverlapping exposure records, as the imported engine expects.
4. **Arcade-specific exception:** the adapter clears `exerciseCooldownUntil` when starting a new DEX-owned bout. That field blocks the simulator's next exercise action after a long bout; it is not itself an ODE recovery state. Leaving it enabled would let DEX visibly run while the engine silently rejected the activity. This differs from the earlier planning note to respect that action cooldown. Recovery states and the engine's completed exposure records are retained. The engine's four-hour auto-stop is detected and a continuing run can start the next bout.
5. Death, attract-title return and level completion stop the activity. Level reset creates a fresh engine/controller at the existing fasting BG 6 start. No physiology advances in non-playing states. Tutorial slow motion scales both movement and physiology through the same game delta.
6. `DexGameRenderer.advance()` receives model HR **after** the physiology step. It supplies visual effort to the shared 3D model. Standing recovery uses the idle pose with physiological breathing; it does not force the full-strength workshop `pant` preset. Eating and manual mouth poses retain precedence. Workshop-only activity previews remain available when no physiological effort is supplied.
7. Imported engine files are unchanged. The sync workflow now runs the activity compatibility tests in addition to the existing smoke test.

## 4. Verification

Run: `node tests/activity.test.cjs`, `node tests/gameplay.test.js`, `node tests/dex-3d.test.cjs`, `node tests/activity-browser.cjs`.

### Matched fixed-DEX experiment: 30 simulated minutes, initial BG 6, no meal or extra insulin

| Condition | BG (mmol/L) | HR (bpm) | E1 | Pulse factor |
| --- | ---: | ---: | ---: | ---: |
| Previous uncoupled movement / rest | 5.999 | 60.000 | 0.000 | 1.000 |
| Ordinary running / Medium | 4.928 | 129.998 | 1.160 | 1.583 |
| Future super-shoe hook / High | 4.486 | 159.997 | 1.657 | 1.833 |
| Medium, test-only beta=0 ablation | 5.640 | 129.998 | 1.160 | 1.583 |

An additional matched test with one fixed fictional game charge leaves rapid-depot quantities 0.699, 0.622 and 0.586 U at 30 minutes for rest, medium and high. Disabling only rapid-depot perfusion acceleration in the test restores 0.699 U despite continued medium activity. These are diagnostic outputs, not instructions to players.

At integration intervals 1/15 and 1/30 simulated minute, BG differences stay below the test tolerance 0.03 mmol/L. The controller exactly matches the direct engine API at the same interval. Twenty one-minute bouts separated by one-minute rests record exactly twenty exercise minutes and twenty exposure records. A 241-minute run test verifies the engine auto-stop/restart boundary. No claim is made that arbitrary session fragmentation is clinically calibrated.

**Results:** 42 gameplay checks passed; activity contract, continuity, two ablations and timestep checks passed; 1260 3D poses passed. Local Chrome reported no page errors. Browser screenshots are in `tests/playwright/2026-09-06_activity/`.

In the browser run, HR rose from 60 to 129.98 bpm during six game seconds of running. After 0.25 game seconds of stopping, DEX was stationary, activity was off, HR was 120.92 and breathing effort was 0.609. After a further three seconds of rest, HR was 71.54 and visual effort was 0.115. Screenshot `standing-pant.png` shows feet planted; the mouth/torso breathing is driven by that effort and continuous breath phase.

## 5. Findings and status

1. **OK — Missing movement input. STATUS: ✅ FIKSET (2026-09-06).** Real motion now uses the existing cardio API; wall/rest/start/stop tests pass.
2. **OK — Independent panting timer in game. STATUS: ✅ FIKSET (2026-09-06).** Model HR now drives the 3D breathing animation, including standing recovery. Workshop previews are intentionally independent.
3. **NOTE — Simulator action cooldown. STATUS: ⚠️ BY DESIGN.** Arcade adapter bypasses only the next-activity gate. No physical recovery state is cleared.
4. **NOTE — Super shoes. STATUS: ⚠️ DELVIST.** High-cardio hook tested; collectible and movement/gear implementation still pending.
5. **WARNING — Model applicability and level balance. STATUS: ❌ ÅBEN.** This is not clinical validation, and high cardio is not universally more glucose-lowering. All ten stages have not been manually rebalanced/playtested with the now-active exercise effects. No food, insulin supply or automatic rescue was adjusted to compensate.

Summary: two fixed issues, one intentional adapter policy, one partial equipment feature, one open validation/balance limitation. No sub-agents used. No commit/push performed.

## 6. Sources and files

Primary-source abstracts, not full-text reviews:

1. Koivisto VA, Felig P (1978), *Effects of leg exercise on insulin absorption in diabetic patients*, NEJM 298:79-83, DOI 10.1056/NEJM197801122980205. [Saved abstract](../references/Koivisto_1978_LegExercise_Abstract.json). [Verified Europe PMC record](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:619237%20AND%20SRC:MED&resultType=core&format=json).
2. Shetty VB et al. (2021), *Effect of Exercise Intensity on Exogenous Glucose Requirements to Maintain Stable Glycemia At High Insulin Levels in Type 1 Diabetes*, DOI 10.1210/clinem/dgaa768. [Saved abstract](../references/Shetty_2021_ExerciseIntensity_Abstract.json). [Verified Europe PMC record](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:33097945%20AND%20SRC:MED&resultType=core&format=json).

Both Europe PMC endpoints were fetched from the local PC on 2026-09-06, HTTP 200, matching identifiers and titles. PubMed could be read through web search but could not be validated locally; direct PubMed links are therefore not relied on here. Full papers were not retrieved. The task reuses existing model parameters, with no literature-based recalibration or new scientific-reference section.

Code map: `dex-activity.js:11` (lifecycle); `game.js:1511` (motion signal), `game.js:2107` (engine input), `game.js:1453` (HR-to-renderer); `dex-game-renderer.js:32` (visual effort); `docs/dex-3d-model.js:14` (breathing mapping); `engine/physiology-engine.js:1681` (HR/activity), `:2044` (rapid absorption), `:3347`/`:3455` (start/stop); `engine/hovorka.js:641` (Q2), `:676` (E1). Tests and cache versions updated as listed above; `.github/workflows/sync-physiology-engine.yml` now checks this coupling on upstream updates.
