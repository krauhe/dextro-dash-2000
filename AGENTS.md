# DEXTRO DASH 2000 — regulatory design guardrails

Before changing player text, equipment, physiology interfaces, level guidance,
imports/exports, AI features or public claims, read
`docs/REGULATORY-DESIGN-GUIDELINES.md`.

1. Never show dosing recommendations to the player: no amount, timing, interval,
   number of presses or optimal treatment sequence, even for fictional DEX.
   Do not encode the recommendation indirectly in contextual button cues.
2. Static control explanations, inventory counts and factual past-action feedback
   may remain. Do not turn them into instructions triggered by DEX's glucose.
3. Keep DEX fictional and fixed. No personal health inputs, self-calibration,
   clinical predictions, real device connections or medical control.
4. Hidden algorithms, disclaimers, free distribution and open source are not
   regulatory exemptions. Describe intended use, not unverified legal status.
5. Escalate proposed medical functionality or claims before implementing them.
   Do not disguise a medical feature by renaming it as a game feature.
6. Documentation and player-facing text are English. Preserve unrelated changes.
   Do not commit, push or publish without explicit user authorization.

These guardrails supplement the user's instructions; they are not a regulatory
determination or a replacement for qualified assessment.

## Artwork background removal

The user has explicitly authorised code-based background removal for generated
artwork, including baked checkerboards. Do not ask again for that cleanup.
Preserve opaque foreground details such as white eyes and egg shells; inspect
the final RGBA cutout on a dark background before using it in the game.

## Campaign source

`campaign.js` is the active ten-stage data source for the game, generator and
level workshop. The old `level-01.js` and `level-02.js` are not loaded by the app.
Do not edit those old definitions when changing the active campaign.

## Queued requests and open decisions

Read `docs/WORK-QUEUE.md` when continuing work in this project. Keep referenced
requests and unanswered questions there with their response ID, bounded scope,
approval evidence and status. A newer independent message does not cancel an
unfinished request. An explicit replacement or cancellation does.

When the user answers an older ID (for example, "#28 yes"), resolve that item,
acknowledge the approved scope and resume it without asking the same question
again. Work on independent approved items while another item awaits input. Do
not infer approval from silence. Before ending a turn, update what is complete,
still in progress or awaiting an answer. This is a working record, not an app
queue modification or permission to run background tasks, commit or publish.
