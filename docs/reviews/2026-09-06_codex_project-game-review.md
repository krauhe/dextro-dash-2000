# DEXTRO DASH 2000 — project and gameplay review

Date: 2026-09-06  
Reviewed revision: `b36eea37f074359d7b561a3d30fe4e27cd64b878` (`main`, cache version 0.1.3)  
Reviewer: OpenAI Codex  
Status: Reviewed baseline retained below. Follow-up fixes implemented locally on 2026-09-06; no commit or push. See [implementation and verification](2026-09-06_gameplay-feedback-fix.md).

## Summary

The prototype has a distinctive core: contact with food enemies changes the physiological state, while stomping, equipment and timing provide other choices. True BG drives the game consistently, the two stages load, and the separation from the original simulator is working. The current priority should be reliability and readable consequences before adding more content.

Six actionable defects or missing behaviours are documented below. The most important are accidental dismissal of life-loss screens, destructive pump downgrades, and viewport clipping. Separate design findings concern the automatic pump, recovery at high BG, and the relationship between speed and TIR rewards. These are not findings of incorrect physiological equations.

No startup crash or JavaScript syntax error was found in the tested version. This is not a claim that every route or interaction works.

## Scope and evidence

1. Read the gameplay, audio, stage definitions, HTML/CSS, README, engine integration, smoke test and synchronization workflow. Inspected the engine API used by gameplay; did not conduct a scientific or clinical review of the model.
2. Used the browser-test skill's targeted observation workflow on a local HTTP copy. Observed attract/demo behaviour and both stage starts, separate music/effects toggle states, and clipping at 1280 × 600. Inspected browser warnings/errors; none were returned during these checks.
3. Ran syntax checks on `game.js`, `audio.js`, both stage files and both engine files. Ran the existing engine smoke test and `git diff --check`: all passed.
4. Built a review-only Node VM harness in `tests/playwright/2026-09-06_review/review-probes.cjs`. It executes the actual engine and game sources with inert DOM/audio stubs. Accessors are injected into the in-memory source string; production files are not modified. This allows repeatable state-transition and collision probes, but is not a substitute for a human completing both stages.
5. Verified remote Action tags from the local PC: `actions/checkout@v7` and `peter-evans/create-pull-request@v8` exist. The latest listed Pages deployment, run `33994372243`, succeeded for the reviewed commit. Listed engine-sync runs `33986957603` and `33986885222` also succeeded. No workflow was triggered or changed by this review.

Limitations: no complete manual playthrough of every route, frame-time benchmark, subjective audio listening test, cross-browser matrix, mobile usability test, or clinical validation. Screenshots were captured and inspected in the conversation; saving their PNG files was denied by the read-only browser filesystem sandbox. The report therefore records measurements and reproduction steps rather than pretending that screenshot files were saved. The local harness is in the existing gitignored test-output directory.

## Confirmed defects and omissions

### 1. [P2 / Warning] A held movement key dismisses the life-loss screen

Status: ✅ FIXED locally (2026-09-06): transitions require a fresh press; regression-tested for life loss, Game Over and completion.  
Location: `game.js:1011`, especially the restart branch before the `event.repeat` guard at approximately line 1076.

The handler accepts repeated keydown events when the state is `life-lost`, `game-over` or `won`. The check that rejects repeats comes after the restart logic. Thus a player still holding Right when DEX falls can restart without releasing and pressing a key again. This defeats the requested persistent explanation of what happened. The same path can skip the completed-level screen after the tally finishes.

Reproduction with actual handlers: start a stage, invoke a life loss and finish its animation, then pass `{key: 'ArrowRight', repeat: true}`. The state changes from `life-lost` to `playing`.

Suggested fix: require a new, non-repeated press for screen transitions, while still allowing held movement during normal play. Regression test both held-key dismissal and a genuine new press, including the final Game Over and completed-level cases.

### 2. [P2 / Warning] Backtracking can destroy an upgraded pump and its stored insulin

Status: ✅ FIXED locally (2026-09-06): keep upgraded equipment and inventory; both upgrade directions regression-tested.  
Location: `game.js:1491`, manual-pump branch around line 1522; equipment placement in `level-02.js`.

The manual pump unconditionally sets `autoPumpActive = false` and `pumpInsulinStored = 0`. A player can skip the first pump, collect the advanced backpack and insulin later, then return to the uncollected manual pump. Touching it downgrades the equipment and discards all stored doses without warning.

Controlled collection probe: automatic pump with two stored doses → collect manual pump → manual mode with zero doses. The probe uses the real collection function and existing level items; repositioning bypasses traversal, not pickup logic.

Suggested fix: define an equipment rank and retain the best equipped version. A lower-tier pickup should not silently replace a higher-tier pump or erase stock. Preserve doses through every supported equipment transition and test backtracking explicitly.

### 3. [P2 / Warning] The game and audio controls are clipped on short desktop viewports

Status: ✅ FIXED locally (2026-09-06): height-aware Full HD 16:9 canvas sizing; browser-checked at 1280 × 600, 1366 × 768 and 800 × 450.  
Location: `style.css:27`, `style.css:38`, `style.css:383`.

The desktop cabinet is sized by width while `body` disables scrolling. Height-aware sizing only activates below 500 px. At 1280 × 600, a measured cabinet was 652.5 px tall and the audio buttons occupied y = 654.5–690.5, outside the viewport. The screenshot confirmed missing bottom content and inaccessible buttons. The page's total measured height was 738.5 px.

Suggested fix: constrain the cabinet by both available width and available height at all viewport sizes, reserving space for toolbar and padding. Check 1280 × 600, 1366 × 768 and a short landscape viewport. Do not solve this by cropping the canvas.

### 4. [P2 / Warning] First-use hints do not reliably survive their intended five seconds

Status: ✅ FIXED locally (2026-09-06): separate queued hints, 12 visible gameplay seconds each, below the playfield. Pickup labels cannot overwrite them.  
Location: `game.js:802` and `game.js:1491`.

All hints and event labels use one mutable `message` slot. A candy hint is assigned five seconds, but the next insulin pickup, meal, pump-full message or action replaces it immediately. The `candyHintShown` flag is already true, so collecting another candy does not restore the interrupted introduction. Pump hints have the same ownership problem.

Probe: first candy → five-second A-key hint; subsequent pen → `1 U INSULIN` for 0.8 seconds, while the first-use flag remains true. The probe proves overwrite semantics; actual exposure time depends on the player's route.

Suggested fix: keep tutorial hints separate from transient world labels, or queue them with priority. Mark a hint completed after enough visible reading time, not merely when assigned.

### 5. [P2 / Warning] The pit-darkening drawing is entirely below the screen

Status: ✅ FIXED locally (2026-09-06): draw only actual ground gaps from visible world y=154 down to the viewport bottom.  
Location: `game.js:1747` and `game.js:1863`.

The renderer translates world drawing downward by the 32 px HUD. `drawLevel()` then draws its intended pit-darkening rectangle at world y = 176. Its first screen row is consequently 208, beyond the logical 200 px canvas. The rectangle cannot make the pits darker as its comment claims.

This leaves the detailed background visible through gaps without the intended depth cue. In a game where the foliage already meets the walking surface, this weakens the distinction between solid ground and a fall.

Suggested fix: render the cue within the visible playfield and only where there are actual gaps, behind the solid platforms. Verify a normal platform and an adjacent pit together. Do not reintroduce decorative foreground elements over DEX.

### 6. [P2 / Warning] The requested low/high BG audio alarms are absent

Status: ✅ FIXED locally (2026-09-06): different low/high motifs, rate limits and boundary hysteresis; the effects toggle also silences scheduled tones.  
Location: `game.js:1581`, CGM rendering around `game.js:2484`, and `audio.js`.

The CGM lamp has BG-dependent colour and pulse behaviour. There is no low/high BG alarm call in the physiology update and no corresponding alarm methods in the audio class. Death audio does not provide advance warning. This is a missing previously requested behaviour, not a failure to unlock browser audio.

Suggested fix: add distinct, rate-limited game warnings that respect the effects toggle independently of music. Avoid firing on every simulation step or chattering around a boundary. Treat this as fictional gameplay feedback, not a real CGM alarm specification.

## Gameplay and balance decisions

### 7. [High-priority design review] The advanced pump can cause a delayed low in an ordinary food scenario

Status: ✅ UPDATED by user decision (2026-09-06): internal fictional controller considers current BG, COB and IOB, doses singly and re-evaluates after a pause. No dosing recommendations in the player UI. Full-pump overflow is still immediately consumed, explicitly by design.  
Location: `game.js:776` and automatic-pump constants near the top of the file.

The pump gives 1 U above BG 7, waits five real seconds and repeats while stock remains. It does not consult active insulin, trend or recent total delivery. This implements the requested threshold rule, but can make the advanced item feel less trustworthy than the manual version.

Controlled integration scenario: start at the game's steady state near 6, equip the auto pump with three doses, and add the configured equivalent of one 20 g-carbohydrate soda. No further food, candy, movement, collisions or manual doses were added.

| Event | Real seconds | True BG, mmol/L |
| --- | ---: | ---: |
| First automatic dose | 2.37 | 7.005 |
| Second automatic dose | 7.38 | 10.230 |
| Third automatic dose | 12.40 | 11.459 |
| Peak in this probe | — | 11.521 |
| Low-BG life-loss condition | 67.03 | 2.800, just below threshold |

These are outputs of the current fictional game configuration, not patient predictions or dosing advice. The test isolates the controller and is not a full level traversal. Candy or other food during play would change the outcome.

Suggested next step: define what the advanced equipment should guarantee in gameplay, then test representative sequences before selecting a different control rule. At minimum, consider already delivered insulin and make automatic activity legible to the player. A separate model/controller review would be appropriate before asserting physiological accuracy.

### 8. [Design] High-BG weakness needs a reliable recovery route

Status: ⚠️ BY DESIGN (user decision, 2026-09-06): waiting or backtracking may help, but no guaranteed rescue route is required. Ordinary running speed and jump height now degrade linearly from BG 10 to 19.  
Location: `game.js:720`, `game.js:1169`, and the mandatory gaps in `level-02.js`.

High BG intentionally reduces both jump speed and horizontal speed. At full fatigue the measured normal jump rose approximately 19.90 logical pixels, compared with 43.89 near BG 6. A ground jump starting at x = 520 crossed the first stage-2 gap at normal BG, but failed at BG 18. Ground running used the configured maximum speeds of 88 and 44 respectively.

This is not evidence that the entire stage is impossible: elevated launch points and monster boosts can change reachability. It does establish that routes available before a meal may become unavailable afterwards. Once useful enemies are eaten or stomped, the player may have fewer recovery options.

Suggested next step: playtest every mandatory gap at several BG states and with its nearby boost enemy already gone. Retain weakness, but ensure there is an intentional way to recover or backtrack. Small jump-buffer and coyote-time allowances are also worth testing for control feel; these are suggestions, not missing physiological features.

### 9. [Design] TIR is rewarded mainly through remaining time

Status: ✅ RESOLVED by user decision (2026-09-06): TIR removed from counters, HUD and scoring. Only time and diamonds remain in the level bonus tally.  
Location: `game.js:872`.

`tirBonus = round(timeBonus * tirFraction)`. Consequently, excellent BG control near the time limit earns very little, while speed is rewarded twice. At 100% TIR the tested TIR awards were 50 points with one second left, 1,500 with 30 seconds left, and 3,000 with 60 seconds left.

Suggested next step: decide whether BG control should be a distinct achievement or just a modifier of speed. A separate TIR base award would keep good control meaningful on a slow completion. Show a collected-diamond count before the final tally so players can understand the other bonus they are building.

### 10. [Design hypothesis] Avoiding all physiological inputs may be the best-scoring strategy

Status: ⚠️ NEEDS PLAYTEST  
Location: `game.js:285`, food/stomp handling, and `game.js:1581`.

The clean start behaves as requested: a 120-real-second integration probe with no food or extra insulin remained at 5.994–6.000, COB 0, displayed IOB 0 and TIR 100%. Running input is not connected to an exercise input in this arcade wrapper.

Thus the need for active BG management comes from optional contact with food and insulin, rather than elapsed running alone. A player who can stomp/avoid the relevant objects may obtain perfect TIR without managing anything. This review did not prove a complete no-input route through both stages; it is a balancing hypothesis, not a confirmed level-design exploit.

Suggested next step: compare three human play styles: stomp/avoid, eat-and-manage, and speedrun. Make eating and BG management a rewarding choice if they are meant to be central. Do not add arbitrary physiological drift just to make the starting value unstable.

### 11. [Design] Define whether life loss permits duplicate diamond bonuses

Status: ⚠️ DECISION REQUIRED  
Location: `game.js:351`, `game.js:862`.

Respawn preserves `collectedDiamondCount` because it preserves score, but recreates every diamond as uncollected. A probe collected the same placed diamond once before death and once after respawn; the bonus count became two. Ordinary pickups and enemy points can also be earned again after a reset.

This can be a deliberate arcade rule, but it conflicts with a possible interpretation of the end-of-level diamond row as unique collectibles. Decide explicitly whether lives are allowed to be traded for additional collection opportunities. Then test the chosen rule rather than resetting only part of the bookkeeping.

## Project and presentation improvements

### 12. [High priority] Add gameplay regression checks before expanding the game

Status: ⚠️ PARTIAL (2026-09-06): 15 permanent gameplay checks and a level-tool/asset suite added. A dedicated gameplay CI workflow and exhaustive route checks remain future work.

The only tracked automated test is `tests/engine-smoke.test.js`. It initializes the engine, advances one simulated minute and checks for a finite, broadly bounded BG. That test passes even with every confirmed gameplay defect above. The sync workflow runs it; there is no separate push/PR gameplay test workflow in the reviewed repository.

Suggested first regression suite: held-key transitions, pump upgrades/backtracking, full storage, hint visibility, respawn counters, level-to-level score carryover, low-BG feedback, ordinary and boosted jumps, and representative food-plus-insulin sequences. The review probes deliberately assert current faulty behaviour; they must be converted to expected-correct assertions if promoted into a permanent suite.

The existing split between engine, stage data and audio is helpful. At 3,477 lines, `game.js` now couples inventory, UI, collision handling and render details closely. Extracting a small inventory/state module when addressing those bugs would be useful; a whole-game rewrite or framework migration is not justified by this review.

### 13. [Performance opportunity, not a measured stutter diagnosis] Reduce display-asset weight

A static scan of image references in the three app entry files found 18 PNGs totalling approximately 21.81 MiB compressed. Their dimensions imply about 107.71 MiB for one decoded RGBA copy of each image, before canvas/GPU copies. There were no missing PNGs among those references. These figures are not measured browser memory or cold-load time.

Eleven additional root PNGs in `assets/` were not referenced by those entry files; some are likely useful source or older artwork. Unused files do not automatically add to page downloads, so do not conflate repository size with runtime cost or delete source art indiscriminately.

Suggested next step: derive smaller runtime sprites, preserve the high-resolution source art separately, and measure cold loading and frame time. Cache unchanging filtered background work if profiling identifies it as expensive. Keep opaque foliage and genuinely transparent gaps; do not solve rendering cost with global semi-transparency or another rough top-cut mask.

### 14. [Presentation] Pause, audio and terminology need a small consistency pass

1. Add a deliberate pause/resume policy. The current blur handler only clears Left/Right; it does not change the game state. While frames continue, so do time and physiology. Hidden-tab scheduling is also distinct from pausing, so define both rather than relying on browser throttling.
2. `winLevel()` still shows `STAGE 1 CLEAR!` for the first stage and `LEVEL 2 COMPLETED` for the final one. This differs from the requested consistent `Level x completed` wording.
3. `PRESS A BUTTON TO PLAY` does not match every reasonable interpretation: Space starts from attract demo but not the ordinary title; Enter is not a start key. A small consistency fix would remove this distinction.
4. The hidden HTML overlay uses opacity rather than removing its content from the accessibility tree. Browser observations during gameplay still exposed old credits/title or life-loss text. Apply visibility semantics alongside visual hiding.
5. The music has multiple voices already. One concrete composition detail worth auditioning is `audio.js:152`: the arpeggio always includes both +15 and +16 semitone offsets, while sustained chords choose a minor or major third separately. That can create intentional tension or unwanted clashes. A chord-aware arpeggio is an audition candidate, not a proven audio defect; no subjective listening verdict is claimed here.

## Recommended order

1. Fix defects 1–4 and add focused tests for them: screen transitions, inventory preservation, viewport fit and first-use hints.
2. Address pit readability and missing BG sound feedback (5–6).
3. Review automatic-pump behaviour and high-BG recovery before adding more enemies or stages (7–8).
4. Playtest the scoring/food incentives and decide respawn collection rules (9–11).
5. Expand automated checks, then profile assets/rendering and make the presentation pass (12–14).

## Final status

Follow-up status (2026-09-06): defects 1–6 fixed locally; 7 updated by explicit user choice; 8 accepted by design; 9 resolved by removing TIR. Findings 10–11 and remaining parts of 12–14 were not broadly implemented. Consistent completion wording from 14.2 was included with the tally change. Current regression tests assert corrected behavior, unlike the historical reproduction harness. No clinical validation, complete route playthrough, commit or push is claimed. Detailed evidence and limitations are in the linked fix note.
