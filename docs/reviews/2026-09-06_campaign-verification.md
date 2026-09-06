# Campaign implementation verification

Date: 2026-09-06. Local changes only; no commit or publication.

## Scope and evidence

1. Engine smoke: starts at true BG 6.000; passes. Engine source files were not modified.
2. Gameplay regressions: 27 checks covering existing equipment, alarms, scores and jump behaviour, plus tutorial timing, ten-stage starts, tunnel collisions, head-hit caches, crumbling floors, egg warning/fall/roll, biome music and actual stomp-plateau landings at 30/60 FPS.
3. Level tools: generates stages 1–10 from the shared factory, verifies supported patrols, pen/diamond overlap, the first two restricted rosters, deterministic repeated output, RGBA food files and all biome asset paths.
4. Browser smoke on local port 8766: gameplay starts with number keys; orchard, volcano and ice scenery rendered; tutorial ON/OFF survived reload; the movement hint and CONTINUE control appeared in the live DOM. No runtime errors were returned in the inspected browser log. Browser checks are not a complete ten-stage playthrough or a subjective listening review.
5. Cutouts: all six food sprites inspected on a dark background. Banana corrected to one unpeeled body; the exposed-fruit variant was rejected. The final script also removes the one-pixel bright matte edge. White eyes and the egg body remain opaque.

## Issues found and corrected during implementation

1. FIXED: the high reward cache originally intercepted DEX's bounce. It now sits to the side, with standing clearance; actual collision tests reach the plateau at 30 and 60 FPS.
2. FIXED: a volcanic patrol extended into the newly added lava gap. Its patrol bounds now remain on supported ground.
3. FIXED: old generator progression and two-stage workshop data no longer matched the game. Both now read the shared campaign factory.
4. FIXED: banana/pizza leg slice boundaries included too much of their lower bodies. Their leg cut starts lower, preserving the single body silhouette.
5. FIXED: distant pizza encounters could begin attacks before DEX approached them. Windup now activates within 190 logical units; an already telegraphed throw still finishes toward its locked target.

## Open limitations

1. OPEN: full human playthrough and difficulty balancing of all ten stages, including optional routes at different simulated BG levels. No claim that every run has a recovery path.
2. BY DESIGN: the campaign reuses authored encounter modules, and factory/citadel reuse cellar/cave plates with different terrain palettes. No vertical camera or new shoe equipment in this implementation.
3. BY DESIGN: generated background plates are approximately 1672 × 941, not native Full HD; the gameplay canvas remains 1920 × 1080.
4. OPEN: this is not a new physiological or legal review. Source composition and inherited absorption assumptions are documented in `docs/CAMPAIGN.md`; no treatment recommendations were added.

Overall: implemented mechanics pass the automated checks. Human campaign balancing remains open.
