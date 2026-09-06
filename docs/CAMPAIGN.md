# Ten-stage campaign — implementation notes

Updated: 2026-09-06. Prototype campaign; see CHANGELOG.md for release notes.

## Progression

| Stage | Setting | Introductions and main encounters |
| --- | --- | --- |
| 1 Orchard Start | Orchard | Apple Lady only; caches, a low food tunnel and a pen/diamond route; movement learned through play |
| 2 Orchard Tumble | Orchard | Apple and Egg Man only; egg warning/drop/roll, a stomp-only bonus plateau |
| 3 Fruit Market | Orchard | Banana and avocado; manual pump, candy-cane tunnel, higher rewards |
| 4 Cellar Fizz | Cellar | Fizzler, shaking hazard and boosted stomp; darker music |
| 5 Crystal Crumble Cavern | Cave | Crumbler and collapsing floors with a stable upper alternative |
| 6 Alpine Burger Pass | Mountains | Burger Man, high stashes and mixed food routes |
| 7 Pizza Volcano | Volcano | Pizza Lady aims before throwing; lava gaps and collapsing floors |
| 8 Icebox Run | Ice cavern | Egg hazards return with soda, banana and avocado; bell-like music |
| 9 Pantry Works | Industrial palette | Mixed cast and advanced backpack; cellar artwork reused |
| 10 Sugarfall Citadel | Crystal citadel | Combined encounters, advanced backpack, volcanic music; cave artwork reused |

These are original modular layouts, not reconstructions of another game's levels. The campaign data, JSON generator and development maps share `campaign.js`. Seeds vary optional ground diamonds, not route geometry. The factory is intentionally constrained rather than claiming to generate arbitrary validated levels.

The mandatory low tunnel has a solid ceiling, not just a floating one-way platform. There is room to walk but not to jump over its food. Stomp-only plateaus have a ground bypass; their cache sits beside the bounce arc, with enough clearance to stand underneath. Food/pen routes trade reward access against changes to DEX's simulated state. No controller recommendations are shown.

Egg Man's danger is mechanical: the egg warns for 1.4 game seconds, falls, then rolls for 2.6 seconds. Contact during falling/rolling costs a life. A resting egg is edible. Nutritional impact and collision danger are separate, and food is not labelled morally good or bad.

## Onboarding

Tips use a large fixed panel inside the playfield, below the HUD and clear of the BG scale. Opening arrow-key tips and generic food-effect explanations are omitted, leaving room for discovery. Remaining tips introduce equipment controls and special hazards such as rolling eggs, shaking Fizzler and collapsing floors.

With tutorials enabled, stage 1 also reuses the title screen's keyboard sketch in the spare HUD area. It stays until the first movement input, then disappears after 3 real seconds. The A/Z section returns for 6 seconds on the first 3 qualifying pickups combined per new run: stored candy, a newly equipped manual pump, or a pen stored in that manual pump. Automatic equipment, immediately consumed pens and candy canes do not trigger it. The count carries across levels and lives; a new run resets it. These passive sketches never slow the game or depend on BG. Reading a full tip temporarily preserves their remaining display time. Switching tutorials off hides them immediately.

First-use tips use 12 seconds of real reading time while world movement, hazards, remaining time and physiology all run at 6% speed. Enter or CONTINUE dismisses a tip. The tutorial toggle persists through localStorage on the device. Rejected storage access falls back to the session setting. Encounter tips are remembered within the current page session; disabling and re-enabling tutorials does not replay already discovered encounters. Pickup tips describe fixed controls and inventory, never BG-triggered dosing instructions.

## Food composition and provenance

The four new simple foods use USDA FoodData Central SR Legacy records, fetched and identified through the official API from the local PC on 2026-09-06. Values below are per in-game edible portion, not dietary advice. US total carbohydrate includes fibre; available carbohydrate is total minus fibre. Fibre is separately passed through the engine's existing food parameters.

| Food / USDA FDC ID | Portion g | Available carbohydrate g | Protein g | Fat g | Fibre g |
| --- | ---: | ---: | ---: | ---: | ---: |
| Raw apple with skin / 171688 | 100 | 11.41 | 0.26 | 0.17 | 2.4 |
| Hard-boiled whole egg / 173424 | 50 | 0.56 | 6.29 | 5.305 | 0 |
| Raw banana / 173944 | 100 | 20.24 | 1.09 | 0.33 | 2.6 |
| Raw avocado / 171705 | 75 | 1.3725 | 1.5 | 10.995 | 5.025 |

Official API records were retrieved with `/fdc/v1/food/{id}` at `api.nal.usda.gov`; identities matched the names above. Sugar amounts for these portions are 10.39, 0.56, 12.23 and 0.495 g respectively. The mapping from food composition to simpleFraction/fibre parameters uses the existing engine interface; it is not a validation of glycaemic predictions. Eat-time settings are fictional simulation assumptions.

Burger Man preserves T1D Simulator's `js/foods.js:burger` catalogue portion: 300 g, 40 g carbohydrate, 40 g protein, 40 g fat and 6 simulated minutes eat time. Its absorption settings are gameplay/model assumptions, not measured sugar/fibre composition. Existing cake, soda and pizza profiles remain in `game.js`; they are inherited approximate reference portions, not newly measured foods. Their fat and protein still enter the physiology engine. No changes were made to the engine equations or controller in this expansion.

Food-contact particle labels show the consumed portion's carbohydrate, protein and fat in the T1D colours: green `#4ade80`, blue `#60a5fa`, amber `#f59e0b`. These report a past fictional event, not an instruction.

## Artwork and audio

Five new opaque high-resolution background plates are stored as `assets/biome-{cellar,cave,mountain,volcano,ice}.png`. They are complete connected scenes, not cut-out semi-transparent islands. The existing orchard retains its working background implementation. Factory and citadel currently reuse plates with different terrain palettes. Generated plates are approximately 1672 × 941, displayed in the Full HD game; they are not native 1920 × 1080 renders.

Six food cutouts are `assets/food-{apple,egg,banana,avocado,burger,pizza}.png`, 512 × 512 RGBA. The user authorised code-based background removal. `tools/prepare-food-sprites.py` removes the boundary-connected pale checkerboard, preserves enclosed eyes/egg whites and removes the residual one-pixel matte edge. Banana Man was regenerated as one unpeeled banana: no extra fruit or peel around the mouth. Runtime animation mirrors direction and moves the leg sections; banana and pizza use lower cut boundaries to avoid duplicating their bodies.

Images were made with the built-in image generation tool, not an external API fallback. Final banana prompt: “One standalone BANANA MAN, exactly one whole unpeeled curved yellow banana, no flaps or second fruit, eyes and smiling mouth directly on smooth skin, purple arms and legs, cream gloves and chunky purple sneakers, polished original 90s arcade rendering, centered, transparent background, no text or floor.” Background prompt set: “High-resolution wide side-on original arcade background; [stone cellar / blue-purple crystal cave / snowy mountain pass / orange volcanic cavern / blue ice cavern]; detailed crisp painterly art, quiet central gameplay area, continuous natural floor from the bottom edge, opaque complete scene, no floating islands, characters, UI or lettering.” A six-cell reference sheet supplied apple, egg, avocado, burger and pizza characters in the same glossy arcade family. The generator returned baked checkerboards for food images, which were removed with the authorised code workflow.

Dark, ice and volcano tracks are original code-generated arrangements in `audio.js`; bright levels retain the existing track. Music and effects remain independently switchable.

## Verification and remaining limits

Automated checks cover all ten stage schemas and patrol support, shared generator determinism, RGBA assets, actual solid-ceiling/head-cache collisions, crumble timing/reset, egg transitions/contact, tutorial timing, and reaching the high plateau after a stomp at both 30 and 60 FPS. Existing pump, BG, jump, alarm and score tests still run. These are gameplay tests, not clinical validation.

The campaign still needs a full human difficulty/balance playthrough. Automated mechanic checks do not prove every optional reward is reachable in every BG state or guarantee an insulin/sugar recovery path. Repeated encounter modules and reused factory/citadel plates are deliberate prototype limits. There is no vertical camera or additional wearable gear beyond the pumps yet.
