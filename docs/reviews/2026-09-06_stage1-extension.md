# Stage 1 extension — response #28, approved in #31

Date: 2026-09-06. Local implementation only, no commit or push.

## Scope and result

The owner approved the previously pending extension with "#28 ja". The existing
opening remains in place. Two hand-authored areas are inserted before the finish
approach; stage 2 onward, food portions, physics and physiology are unchanged.

| Measure | Before | After |
| --- | ---: | ---: |
| Stage width | 2020 | 3000 |
| Finish X | 1920 | 2900 |
| Time limit | 95 s | 145 s |
| Platforms / terrain pieces | 18 | 35 |
| Diamonds | 23 | 43 |
| Placed pickups | 3 | 7 |
| Placed apple monsters | 3 | 5 |
| Mystery caches | 3 | 4 |

Active seed remains 2000. The 980-unit extension is 48.5% of the previous width.
The original roster stays apple-only. Two new candy pickups remain stored actions;
two new insulin capsules overlap optional diamond rewards. No equipment tier or
new monster type is introduced.

## New areas

1. **Canopy Ladder, 1700–2100:** Uneven low roots and permanent middle terraces
   support both directions. A stationary apple on the y=91 terrace can boost DEX
   to a diamond crown at y=37. The 54-unit elevation difference exceeds the
   ordinary ideal 45.7-unit jump rise. Losing the apple loses that optional bonus,
   not the main route. A lower insulin/diamond shelf and a candy add choices.
2. **Hollow Run, 2180–2560:** A low apple passage lies under a climbable root roof.
   The roof route leads to an insulin/diamond shelf. A 28-unit trench and a broad
   landing follow; permanent steps also allow return travel. A raised cache can
   be hit without trapping DEX beneath it.

The short transition and final approach remain stable ground. The shared
`campaign.js` data automatically feeds the game, generator and overview metadata.
No copied layout, new artwork or vertical camera was introduced.

## Findings and verification

1. **FIXED:** The pre-existing Orchard Fork exit cache obstructed reverse travel
   at fixed BG 14.5. Moving its y from 112 to 93 leaves enough headroom above the
   adjacent ridge. Forward and reverse route tests now pass there.
2. **PASS:** All eight named opening areas traverse both directions at 30/60 FPS
   with actual collision functions and fixed BG 6. All stage-1 areas also pass
   both directions at fixed BG 14.5. The other areas retain their forward check.
3. **PASS:** Actual apple contact launches the canopy stomp; DEX lands on the
   crown and collects diamonds at 30/60/120 FPS. The permanent middle terrace is
   separately reachable with no enemies. Normal and short jumps are in the search.
4. **PASS:** Chrome replays 24 local route sequences plus the new crown stomp.
   Full HD screenshots of both new areas and the crown were inspected. No page
   errors. The replay uses real collision functions but freezes physiology and
   removes enemies except in the dedicated stomp test.
5. **PASS:** Stage width/time/finish assertions, shared-generator schema and
   determinism, patrol support, engine smoke test and 42 gameplay regression checks.
   Existing pump empty/full/overflow checks still pass; stage 1 adds no pump.
6. **LIMIT:** No full live-physiology stage playthrough or exhaustive collection
   of every bonus combination was performed. Main local geometry sequences take
   approximately 3.9–4.4 s per area; this is not a human completion-time estimate.
   The 145-second limit adds exploration room proportionally to stage length and
   remains a playtest tuning choice. No physiological rate was changed to fit it.
7. **LIMIT:** The overview resource remains subject to an earlier browser access
   restriction. Its shared source was read; it was not reopened or bypassed.
   Actual game screenshots and data assertions provide the evidence here.

Evidence: `tests/playwright/2026-09-06_opening-units/`, including
`canopyLadder.png`, `hollowRun.png`, `canopy-crown-stomp.png` and `routes.json`.

## Queue handling

`docs/WORK-QUEUE.md` records the answered #28 and its approval. `AGENTS.md` now
requires preserving unfinished independent requests and matching replies by ID.
This is a project working convention, not a change to the Codex message queue,
not a guarantee of autonomous continuation, and not permission to publish.
