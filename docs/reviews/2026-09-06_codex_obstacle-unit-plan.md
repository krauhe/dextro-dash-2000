# Longer stages built from distinctive obstacle units

Date: 2026-09-06. Status: design proposal, not a runtime implementation.
The personal `dextro-level-generator` skill has been updated. No stage, physics,
food profile or engine code was changed for this planning task.

## 1. What repeats now

Source inspection: `campaign.js`, `tools/generate-level.cjs`,
`docs/level-overview.html`, movement constants and collisions in `game.js`.
The browser refused access to the user's file-based overview, so visual editor
inspection was not completed. The following findings come from its shared data
and renderer source, not a claimed screenshot review.

1. **OPEN — fixed grid and geometry.** Every encounter receives 420 horizontal
   units. All ten stages use `penRoute`, with the same platforms at local
   `(35,128)`, `(96,108)` and `(178,128)`. `stomp` repeats in nine stages,
   `foodGate` in eight and `caneVault` in seven. All six crumble encounters use
   the same three 32-unit floor tiles. Changing seeds 42 to 99 leaves stage-3
   platform geometry identical; only bonus diamonds change.
2. **OPEN — mostly flat baseline.** Most encounter types allocate an unbroken
   420-unit ground platform at y=154 before placing content above it. Solid
   food-gate ceilings do not provide the varied ground obstacles requested.
3. **OPEN — encounter identity comes mostly from skins.** The same three-step
   insulin route is repeated in orchard, cellar, ice and castle. Theme colours
   cannot change the movement decision.
4. **OPEN — height tooling.** The overview exaggerates height; the gameplay
   camera is horizontal only. Current ideal ordinary jump rise is about 45.7
   units, same-height range about 73.8 at speed 88, jump speed 218 and gravity
   520. Those are theoretical limits, not comfortable placement targets.

## 2. Video reference, observations and original adaptation

[World of Longplays: The Great Giana Sisters, C64](https://www.youtube.com/watch?v=QL3fje5WRrY)
was opened successfully on the local PC. Sampled the early gameplay around
5:22 and stage 3 after navigating to 7:00. This was a short visual sample, not
a review of the complete longplay. Around 5:22, ground-connected block stacks,
a gap and elevated reward blocks combine into one crossing. In the stage-3
sample, columns of different heights replace a flat ground route.

The proposed DEXTRO adaptation is structural: distinctive ground silhouettes,
varied landing heights and a visible prize beyond a crossing. No source art,
music, code or exact coordinates are copied.

## 3. Proposed campaign length and character

Targets are provisional logical widths, not playtime promises. Recalculate
timers from playtests; extending real play also extends accelerated physiology.

| Stage | Current width | Proposed width | Distinctive areas |
| --- | ---: | ---: | --- |
| 1 Orchard Start | 2020 | 3000 | Root ridges, low crate crossing, fruit/diamond pocket, first upper reward |
| 2 Orchard Tumble | 2440 | 3600 | Egg chute, stepped ground, under/over branch, bounce-to-cache |
| 3 Fruit Market | 2860 | 4300 | Stacked stalls, awnings, banana-peel alley, high gear cache |
| 4 Cellar Fizz | 2860 | 4400 | Barrel steps, low tunnel, Fizz timing, alternate cellar ledges |
| 5 Crystal Cavern | 2860 | 4700 | Crumbling ascent, stone pillars, crystal vault, stable descent |
| 6 Alpine Pass | 3280 | 5000 | Ridge switchbacks, upper bridge, long descent, shoe reward route |
| 7 Volcano | 3280 | 5100 | Telegraphing fire vents, basalt islands, pizza aiming windows |
| 8 Icebox Run | 3280 | 5200 | Ice-cream roller alley, refuge ledges, frozen stairs, crumble climb |
| 9 Pantry Works | 3700 | 5500 | Stacked machinery, service passages, elevated caches, later ice-cream encounter |
| 10 New circus | New | 5500 | Big-top ascent, popcorn crossing, candy-floss bonus route, ice-cream encounter |
| 11 Citadel (currently 10) | 4120 | 6000 | Falling spike grille, rotating gate, fire courtyard, final vertical reward route |

The owner selected an additional circus stage before the final castle on
2026-09-06. Keep Pantry Works and expand to eleven stages, updating stage counts,
selection controls and progression together. The current ten digit shortcuts
cannot alone select all eleven stages; extend the development selector explicitly.
Ice-cream enemies debut in ice
and recur in later stages, without making every later screen a projectile gauntlet.

## 4. Obstacle units

Each area usually spans 300–400 units, approximately a screen at current logical
resolution, but widths and connections vary. Use approach → challenge → choice
→ exit, not another fixed tile template. Each unit has an ID, required runtime
features, entry/exit height, main path, optional reward path and escape route.
Longer stages come from more distinct situations, not longer empty connectors.

### Pilot A: 360-unit ice-cream alley

1. **0–60:** safe approach. Show an ice-cream monster winding up and a scoop
   rolling past before DEX must commit.
2. **60–150:** first ground-level rolling-scoop crossing, with a low refuge
   platform. Scoops roll into real gaps rather than pass through all floors.
3. **150–265:** route split. Lower route gives fewer points. Upper stepped
   route leads to a clearly visible diamond cluster intertwined with insulin
   capsules; validate the overlap using pickup and DEX hitboxes.
4. **265–330:** a short crumbling ascent leads to a substantial cache. A stable
   descent exists if the monster has been eaten or the steps have collapsed.
5. **330–360:** clear landing and exit, no surprise offscreen projectile.

This is a design sketch, not validated geometry. The new monster needs a wind-up,
floor-aware rolling-scoop projectile, bounded lifetime/count and clear contact
rules. Proposed default: scoops are physical hazards, not automatically eaten
portions. Eating the monster uses its sourced ice-cream portion profile.

### Pilot B: castle gate courtyard

Falling spike grille with chain rattle/visible lift, safe waiting recess, then
a second raised route past a rotating spiked gate. Later versions combine
familiar fire vents with gate timing. Actual bars/teeth cause contact; the empty
corners of a rotating object's rectangular bounding box must not kill DEX.
Interpret the user's wording as a spiked grille, pending correction if needed.

### Height and crumbling walls

Start with climbable wall sections/ledges that crack and collapse individually
after use. Do not erase a whole tower on side contact. For genuinely taller
areas, add bounded vertical camera tracking, upward/landing look-ahead, correct
culling and anchored parallax together. Keep the bottom HUD fixed. Mandatory
routes need visible landings; high optional prizes can demand precision or a
monster bounce. A consumed bounce target must not accidentally trap the player.

## 5. Super shoes: separate movement from physiology

**Status update (2026-09-06): ⚠️ DELVIST.** Ordinary movement is now connected to Medium cardio; an internal super-shoe flag selects the existing High cardio preset. Model HR also drives standing recovery breathing. The shoe pickup and movement boosts remain unimplemented. This supersedes the missing-coupling diagnosis and experimental 2x multiplier below. The arcade adapter deliberately bypasses only the simulator's activity-action cooldown, preserving physiological recovery. See [implementation and verification](2026-09-06_codex_activity-coupling-fix.md).

**OPEN — code finding, not clinical validation:** `game.js` currently steps the
engine but does not call `startActivity()` or `stopActivity()` for movement.
Running/panting animation is therefore not evidence of activity-driven uptake.

The engine already has `contractionUptakeScaling` in its activity definition
(`engine/physiology-engine.js`, default activities and input preparation).
It forms `exerciseInput = normalizedHeartRateExcess * contractionUptakeScaling`.
Hovorka filters that dimensionless input into E1 and uses `beta * E1` for direct
muscle uptake from Q2. This is distinct from insulin-mediated sensitivity,
glycogen use and hepatic responses. Merely assigning `hovorka.exerciseInput`
in the game would be overwritten during the engine step.

Proposed sequence:

1. Define ordinary movement activity first, based on actual displacement and
   active jumping, not a held arrow against a wall. Debounce brief pauses;
   respect activity lifecycle/cooldown and do not create a new session per frame.
2. Prototype shoes with roughly 25% faster running and 30% higher ideal jumps.
   These are tunable game values, not physiological parameters. Preserve
   high-BG weakness; no accidental multiplicative stacking from repeated pickups.
3. Clarify whether "fall faster" means BG decline or physical descent. Do not
   change gravity unless the latter is requested.
4. Compare ordinary running with enhanced effort through the engine's supported
   activity definition. A contraction-scaling candidate of 2 is an experiment,
   not an established physiological calibration or guaranteed double BG fall.
   Do not multiply overall BG change, insulin sensitivity or every exercise
   mechanism. Avoid double counting the ordinary-running workload.
5. Run rest/run/stop/boost contrasts, multiple time steps, IOB/COB interactions
   and onset/offset checks. Account for the arcade's accelerated time. Keep
   simulation changes behind a documented, reviewed game-to-engine boundary;
   do not casually patch the automatically synced upstream model.

The physiology-review skill motivates this separation and the need for further
validation. No quantitative physiology change is approved or validated here.
No dosage advice, recommended button sequence or personal health inputs are added.

## 6. Editor and generation changes proposed

1. Draw named unit boundaries and main/bonus/return routes.
2. Add a true-scale view alongside the current vertically exaggerated overview.
3. Show hazard movement envelopes and warning/active timing, monster patrols,
   crumble sections, reward value and actual insulin/diamond overlap.
4. Add diagnostics for repeated normalised layouts, long unchallenged flat
   stretches, unsupported types and inadequate landings. Do not confuse a
   syntactically valid seed with a different or playable route.
5. Store original authored unit variants; seed selects compatible variants,
   not arbitrary coordinates that can destroy required jumps.

## 7. Implementation order and acceptance

1. Owner-approved Git checkpoint before major runtime work.
2. Unit schema, editor diagnostics, variable ground and vertical camera support.
3. Playable ice pilot plus ice-cream enemy and tested rolling collision.
4. Crumbling ascent, fire and castle-gate pilots with timing and swept collisions.
5. Shoes and movement-to-activity integration as a separately verified change.
6. Expand all stages only after the pilots feel good; add circus art and sourced
   food profiles as the confirmed new stage 10 before the castle.

Check 30/60/120 FPS, short/held jumps, both directions, ordinary/boosted shoes,
empty/full/no pump, eaten bounce targets, collapsed routes and high-BG weakness.
Measure traversal before selecting time limits. Verify finish and reset state.

Status summary: personal skill updated; source audit and short video sampling
complete; visual overview access blocked; all runtime proposals pending design
approval. No full playthrough or physiological calibration was performed.
