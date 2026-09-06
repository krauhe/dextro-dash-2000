# Opening stages: six obstacle units

Date: 2026-09-06. Implemented locally; not committed or published.

Follow-up: [Stage 1 extension](2026-09-06_stage1-extension.md) records the later
approved increase to 3000 units and two additional areas. The length/counts below
describe this earlier six-unit revision, not the latest stage-1 data. Orchard
Fork's exit cache was subsequently raised to y=93 for high-BG reverse clearance.

## Review and scope

The opening three stages previously reused the same insulin staircase three times, the same cache encounter twice, and flat ground under every encounter. Seeds moved a decorative diamond, not the traversal geometry. This revision replaces six encounters with six hand-authored units in the shared campaign builder. It does not pad stage length, replace themes, add enemy types or change physiology.

| Stage | Unit | Interval | Main challenge and choice |
| --- | --- | --- | --- |
| 1 | Root Slalom | 440–800 (360) | Four uneven solid roots, overhead caches, a high diamond shelf, and an apple-overlap reward below. |
| 1 | Orchard Fork | 1280–1660 (380) | Low ridges versus a raised three-platform route. Upper diamonds overlap insulin; the lower route gives fewer diamonds. |
| 2 | Rolling Orchard | 440–800 (360) | A perched egg drops into the lower lane; raised refuges offer escape from rolling contact. Upper insulin/diamond and lower apple/diamond rewards differ. |
| 2 | Crumble Canopy | 1700–2080 (380) | Two temporary high steps lead to an insulin/diamond pocket. Stable soil and permanent low terraces remain after collapse. |
| 3 | Market Roofs | 860–1220 (360) | Staggered solid stalls, a banana patrol and a high, visible manual pump. Permanent steps allow a return without relying on surviving stomp targets. |
| 3 | Market Crossroads | 1700–2080 (380) | A 32-unit ground gap followed by an upper insulin/diamond route and a lower sugar-cane/diamond passage. |

Active seeds remain 2000, 2001 and 2002. Stage lengths/time limits remain 2020/95, 2440/110 and 2860/130. Reproducible generator snapshots used seeds 42, 43 and 44; seed variation still applies to decoration only. The areas are hand-authored, not a claim of general procedural variety.

Apple remains the only stage-1 food; stage 2 adds egg; stage 3 retains banana and avocado. Existing food portions and the distinction between mechanical danger and glucose response remain unchanged. A rolling egg is a mechanical hazard. Stored candy is not treated as immediate food intake. Capsules retain first-three-storage/full-pump-immediate-use behavior.

## Geometry and implementation

Normal ideal jump rise is 218²/(2×520) = 45.7 units; same-height range is 88×436/520 = 73.8 units before acceleration and collision margins. New main steps use smaller increments; all new geometry remains in the horizontal-camera viewport. The highest new landing is y=64. Short/held jumps, acceleration, solid-side collisions and roof collisions are included in the route search.

`campaign.js` remains the only active stage source. Each new `obstacleUnits` entry declares its width, entry, exit, challenge, alternative and reward. `docs/level-overview.html` draws their outlines and prints their names/intervals using those same entries. No separate hand-maintained level copy was added.

## Verification and findings

0. **FIXED (2026-09-06, user screenshot):** Root Slalom's elevated cache left only 21 units above the y=104 platform, less than DEX's 23-unit collision height. Raised the cache from y=67 to y=55, giving 33 units of clearance. Added a specific walking-under test in both directions and a head-hit test at 30/60/120 FPS. The earlier route search proved the upper destination reachable but did not test this local passage.

1. **FIXED:** Two end caches initially left too little space before a solid step when travelling backwards. The adjacent steps were moved to provide room for DEX's hitbox.
2. **FIXED:** One monster cache initially targeted a landing across a ground-section seam and lost its monster outcome. Its position was adjusted to give a fully supported landing within a section.
3. **FIXED:** Root Slalom's extra low cache made the route unnecessarily restrictive at BG 14.5. It was removed; the high cache and end cache remain.
4. **PASS:** Six different units, each 360 or 380 units; supported enemy starts and actual item/diamond overlap.
5. **PASS:** Real game collision search traverses all six units forwards/backwards at 30 and 60 FPS at BG 6. All six also have a forward route at fixed BG 14.5.
6. **PASS:** All six highest bonus landings are reachable without a surviving enemy. Crumble Canopy has a lower route in both directions with all its crumble ledges removed.
7. **PASS:** Chrome replays 18 continuous input sequences: six forward routes, six return routes and six upper-bonus routes. Actual crumble timers run during replay. No page errors. Each sequence starts at the selected unit, not at stage start.
8. **PASS:** Six actual-game screenshots inspected at Full HD: different terrain profiles, visible elevated rewards, supported ground and readable item combinations.
9. **PASS:** Engine smoke test, all 42 gameplay regression checks and scoped whitespace checks. The cache-hit regression now selects a ground-reachable cache by height rather than assuming the first diamond cache is at ground reach.
10. **NOT VERIFIED:** Full stage playthroughs with continuously advancing physiology, live enemies and every inventory combination. Isolated browser route replays freeze physiology and remove enemies; they are geometric tests, not full playthroughs. Existing regression tests separately cover normal/boosted enemy bounces, rolling eggs, banana peels, empty/full pumps and overflow.
11. **NOT VERIFIED:** The overview page itself was not opened because an earlier browser access restriction for that resource remains in force. Its shared data and inline script were inspected; game screenshots provide the visual evidence here. No restriction was bypassed.

Screenshots and generated test paths: `tests/playwright/2026-09-06_opening-units/`.

## Files

1. `campaign.js`: bounded opening-stage geometry and unit metadata.
2. `index.html`: campaign cache key.
3. `docs/level-overview.html`: unit bounds and labels.
4. `tests/opening-units.test.cjs`: schema and actual-collision route search.
5. `tests/opening-units-browser.cjs`: Chrome route replay and screenshots.
6. `tests/gameplay.test.js`: height-based cache test selection.
