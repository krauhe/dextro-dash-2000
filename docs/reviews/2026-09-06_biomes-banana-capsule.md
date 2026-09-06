# Scenery, Banana Man and insulin capsule visual checks

Date: 2026-09-06. Local changes; not committed or published.

## Scope and results

1. Stages 2–5 use new middle parallax layers: orchard grove, fruit-market plants, cellar props and crystal grotto respectively. The existing stage-1 layer remains unchanged. All four are attached below the playfield bottom; only the silhouette and real openings are transparent. No translucent foreground layer was added.
2. Banana Man uses separate leg crops and the existing facing transform. Previously stationary bananas now patrol a short 24-unit travel interval within their encounter. Moving nearby bananas drop a peel periodically. Peels land on supported platforms, give 0.8 seconds of grace, can be jumped over, expire after 12 seconds and clear on restart. Ground contact uses the existing life-loss animation with `BANANA SLIP` feedback. No physiological effect is assigned to the discarded peel.
3. Insulin uses an original code-drawn, uniformly turquoise capsule with hemispherical ends, shading and glow. The reference photograph supplies the capsule shape only; none of its pixels, packaging or watermark are used. Pickups rotate continuously through a foreshortened projection; inventory capsules retain a stable readable pose. Gameplay and insulin physiology are unchanged by the visual replacement.

## Artwork and method

Final images: `assets/parallax-stage-2.png` through `assets/parallax-stage-5.png`.
Generated with the image-generation tool using `assets/parallax-orchard-clean.png` as the style reference. Baked background was removed with `tools/prepare-orchard-middle.cjs`, following the owner's standing permission. Originals remain in the generated-images directory. Cutouts were inspected against a dark background before integration.

Common generation prompt:

> Generate a polished hand-painted panoramic 3:1 platform-game MIDDLE PARALLAX LAYER. Reference image is STYLE and LOW SILHOUETTE reference only. Match clean smooth readable large shapes, no pixelation or noisy tiny texture. Upper 48 percent completely empty transparent alpha. All objects grow FROM a continuous opaque base spanning the entire bottom width, bottom 18 percent solid filled material, no holes in the base. Objects confined to lower half with varied natural outline. Full transparency above silhouette and through real openings. No sky, no distant scene, no floor perspective going to horizon, no floating islands, no cut horizontal tops. No text, characters, UI, checkerboard or white halos. Actual transparent PNG requested.

Theme additions:

1. Orchard: round apple trees, palms, jade shrubs, mossy roots and rounded stones.
2. Market: banana plants, fruit shrubs, low produce crates and baskets without lettering.
3. Cellar: barrels, battered crates, stone steps, copper pipes and moss on dark cobblestones.
4. Grotto: indigo rocks, cyan/violet crystals, small mushrooms and rugged stone; restrained glow.

## Verification

1. `tests/gameplay.test.js`: 41 checks passed, including banana facing, supported peel spawning, grace period, jumping, life loss and reset. Canvas test double now supports radial gradients used by the capsule.
2. `tests/engine-smoke.test.js`: passed during scenery work (steady-state BG 6.000).
3. `tests/scenery-banana-browser.cjs`: Chrome at 1920 x 1080, four stages at two scroll positions, six banana poses and six capsule angles. No page errors. Screenshots in `tests/playwright/2026-09-06_scenery-banana/`.
4. Visually checked: connected terrain, themed silhouettes, both banana directions, separate moving feet, visible peel, rounded capsule outline and small-size readability. The test's enlarged capsule gallery is not part of production UI.

## Findings and limitations

1. FIXED: stage-3 banana had speed zero and a patrol interval equal to its body width. Both prevented walking; the interval now contains actual travel space.
2. FIXED: the earlier round tablet silhouette did not match the requested elongated capsule.
3. These are focused regression and visual tests, not full manual playthroughs of all ten stages. Peel difficulty still needs player feedback.
