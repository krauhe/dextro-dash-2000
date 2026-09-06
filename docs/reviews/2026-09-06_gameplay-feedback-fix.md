# Gameplay feedback and equipment — implementation note

Date: 2026-09-06. Local changes only; no commit/push. This records game-design decisions, not a clinical controller specification.

## 1. Background and decisions

The owner requested fixes for review items 1–6, removal of TIR, continuous weakness between BG 10 and 19, clearer equipment/actions, rotating candy, a level-generator skill and a development map. During implementation the owner also requested a Full HD screen.

Two explicit clarifications govern equipment:

1. Both pumps store the first three collected pens. Once full, additional pens are used immediately, including at low BG. Spending stock creates free slots again. No pump guarantees protection from low BG.
2. The automatic pump uses a hidden game rule based on current fictional BG, COB and IOB. It performs one action, waits, then re-evaluates. The player is not shown its calculation or dose recommendations. This does not hide source code: the repository remains open source.

High-BG recovery is not guaranteed. A player may wait or backtrack if resources remain. No guaranteed escape, rescue pickup or artificial correction of BG was added. The upstream physiology files were not edited.

## 2. Implementation

1. Screen transitions reject repeated keydowns. Backtracking to lower-tier equipment preserves the backpack and stock.
2. Queued first-use hints each receive 12 seconds of active gameplay display. They occupy the bottom toolbar, outside the playfield, and cannot be overwritten by small floating event labels.
3. Pens route through one actual-dose function. Storage does not animate an injection; a delivered dose does. Candy travels from the hand toward the open mouth only when used. Backpack flow pulses indicate automatic/manual delivery. Three separate tubes on the worn backpack and an explicit HUD `0/3`–`3/3` counter display stock.
4. Low/high BG motifs are distinct, use only the effects channel and have boundary hysteresis. Low warning repeats at most every 3 seconds, high at most every 5.5. The scale has a red or orange pulse outside the green range. Sound-off also mutes already scheduled effects.
5. Pit darkening is restricted to actual gaps and the visible bottom of the viewport, not an off-screen rectangle or a decorative foreground layer.
6. TIR counters and rewards are removed. The tally has time and diamonds only. Normal run speed decreases linearly to 50% between 10 and 19; ideal ordinary jump height decreases linearly to 46%. Initial jump velocity uses a square root to produce linear height. Discrete collision/timestep effects still affect measured landings; special enemy boosts retain their own values.
7. Rendering is 1920 × 1080. Logical height and all world coordinates/physics remain unchanged; logical width expands to 200 × 16/9. The visible world is wider, not stretched. Intrinsic canvas ratio determines layout inside the cabinet border. The page reserves room for toolbar and hints on short screens.

## 3. Controller regression experiment

The local implementation uses DEX's fixed game profile, subtracts active rapid insulin from its internal demand estimate, and spends at most one stored dose before an 8-second game-time lockout. Every later action uses the then-current state. There is no queued plan to spend all three slots. This simple rule is not validated for people and must not be presented as a real automatic insulin-delivery algorithm.

The repeatable experiment equips three doses, adds the existing equivalent of a soda with 20 g carbohydrate, and advances 120 real seconds without movement or further pickups. Values below are simulation outputs, not treatment targets.

| Observation | Reviewed baseline | Updated game |
| --- | --- | --- |
| Dose times, real seconds | 2.37, 7.38, 12.40 | 2.37, 10.38 |
| Maximum BG | 11.521 | 11.602 |
| Outcome within experiment | Low-BG life-loss at 67.03 s | Still playing at 120 s |
| Minimum BG during updated experiment | — | 4.625 |
| Doses retained | 0 | 1 |

This is one regression scenario, not proof of safety across meals/routes. Full storage intentionally still allows direct pen doses, which can cause a low. Multiple meals, later pickups and different timing need continued gameplay testing.

## 4. Art provenance and transparency

Built-in image generation was used with the existing red/white candy as reference. Prompt brief: eight consistent views of a glossy unwrapped red/white peppermint rotating around its vertical axis, arranged 4 × 2, no wrapping, text, halo or cast shadow; transparent background. A follow-up edit requested removal of the generated checkerboard while preserving all eight renders.

Both generated results were RGB with a baked checkerboard. The owner explicitly authorized code-based removal. `tools/prepare-candy-atlas.py` identifies each convex candy's red perimeter, retains its opaque white interior, insets the cutout edge, and normalizes frames into an RGBA 1536 × 768 atlas. This deliberately limited convex-mask method must not be reused on leaves or objects with interior holes.

Output: `assets/candy-spin.png`, eight 384 × 384 cells, true alpha range 0–255. Original generated images are retained in the local Codex generated-images folder. Source filename: `exec-4f9888c0-f321-4b99-aa8e-837b97e06f2f.png`. The game cycles actual render frames, with a stable front view in the HUD. The old circular medallion/halo and circular clipping workaround were removed.

## 5. Level tooling

1. Personal skill: `dextro-level-generator`, installed under the local Codex skills folder. Its official validator passes. It directs route design, nutritional provenance, monster progression, original materials and relevant tests; it forbids unsupported mechanics silently appearing in live levels.
2. `tools/generate-level.cjs` produces deterministic JSON drafts and refuses overwrites. Progression is cake → cake/soda → cake/soda/pizza. Some diamonds deliberately overlap pens or food routes. Ground routes remain alongside optional stairs.
3. `docs/level-overview.html` reads both actual stage files and supports zoom plus local draft import. Draft themes are proposals only. No third playable stage, vertical camera, new biome renderer, shoes or head-bump block system was silently added.

## 6. Verification

1. `tests/gameplay.test.js`: 15 checks passed, using actual engine/game sources with test-only VM accessors. Covers transitions, equipment ordering and overflow, hints, actions, no-TIR tally, linear movement, distinct/rate-limited alarms and muting, visible pit drawing, internal re-evaluation and 1920 × 1080 dimensions.
2. `tests/engine-smoke.test.js`: passed at true BG 6.000. Both engine source files remain unchanged.
3. `tests/level-tools.test.cjs`: deterministic drafts, bounds, grounded patrols, supported types, progression, pen/diamond overlap and actual RGBA atlas header passed.
4. Browser: actual game startup and targeted visual fixture checked; empty/full worn backpack, candy bite, pen action, warning bar and bottom hint inspected. No warning/error logs returned during checked scenes. The fixture is ignored test output, not part of production.
5. Final 1280 × 600 layout: toolbar bottom about 561 px; 800 × 450: about 426 px. Both fit. 1366 × 768 and 1920 × 1080 were also inspected; the latter showed the full title artwork and then started stage 2 without logged errors. Measured canvas display ratio is approximately 1.7778, with backing dimensions exactly 1920 × 1080.
6. Workshop: both stages rendered; generated Stage 3 draft loaded via file input; zoom changed successfully. Official skill metadata validation passed after placing PyYAML only in the ignored test dependency folder.

Limits: targeted checks are not full playthroughs, cross-browser coverage, a frame-time benchmark, subjective listening approval, or medical validation. Screenshots were inspected in the conversation; no saved screenshot artifacts are claimed. Local test outputs are ignored by Git.

## 7. Regulatory framing and original mechanics

Hiding a formula or adding a disclaimer does not itself establish exclusion from MDR. Intended purpose and actual functionality matter. Keep the product about a fixed fictional DEX, without personal health inputs, treatment recommendations or real-device control. Any future change in those boundaries warrants qualified regulatory review. The guidance itself is non-binding. [MDCG 2019-11 Rev.1, June 2025](https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf).

Head-bump reward boxes can be explored as an original implementation of a general gameplay idea. That is different from copying another game's source code, artwork, sounds or distinctive presentation. The CJEU distinguishes program functionality from copyright-protected expression; this is not a blanket clearance of a particular game design or other IP rights. [CJEU, SAS Institute, C-406/10](https://curia.europa.eu/jcms/upload/docs/application/pdf/2012-05/cp120053en.pdf). The US Copyright Office likewise distinguishes game ideas/rules from protectable artwork/text, but that US page does not establish Danish legal status. [Copyright Office: Games](https://www.copyright.gov/register/tx-games.html).

Source verification from the local PC: both linked PDF files returned HTTP 200 and their extracted cover text matched the cited authority/title/date; the Copyright Office page returned 200 with title “Games”. An alternative EUR-Lex endpoint returned an empty 202 response and was not used as a verified citation.

## 8. Proposed next mechanics — not implemented

1. Small temporary yellow food pips near DEX after eating, and blue drops after dosing: communicate recent COB/IOB changes without attaching more numerical labels to the character.
2. Running shoes: speed/range benefit with additional simulated activity. This needs explicit game balance and physiology-interface decisions, not just a cosmetic speed multiplier.
3. Spring soles: a separate jump-focused upgrade, easier to understand than combining all benefits in one item.
4. Head-bump supply blocks: original cracked crystal or mechanical containers for diamonds/equipment; deterministic contents and a clear empty state.

These remain suggestions. The owner has not approved their implementation in this change set.

## 9. Code references and coordination

1. [Full HD constants and fixed game profile](../../game.js#L23), [automatic controller](../../game.js#L798), [BG alarms](../../game.js#L1627).
2. [Backpack stock and action drawing](../../game.js#L2865), [fixed bottom hints](../../game.js#L3460), [alarm sounds and muting](../../audio.js#L62).
3. [Responsive cabinet](../../style.css#L39), [HTML canvas and hint region](../../index.html#L13).
4. [Gameplay regressions](../../tests/gameplay.test.js), [generator and asset checks](../../tests/level-tools.test.cjs), [draft generator](../../tools/generate-level.cjs), [map workshop](../level-overview.html), [candy cutout](../../tools/prepare-candy-atlas.py).
5. No sub-agents were used. No upstream physiology, GitHub workflow, live deployment or Git commit was changed.
