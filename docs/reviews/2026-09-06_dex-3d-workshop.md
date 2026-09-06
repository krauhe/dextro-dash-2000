# DEX 3D Character Lab — first concept and verification

Date: 2026-09-06. Scope: `docs/dex-3d.html`, its styles, scene, model and isolated tests. No live-game renderer, controls or physiology changed in this task. Existing uncommitted work is preserved.

## Implementation

1. Procedural 3D character with jointed arms, legs, complete shoes, tapered quills and a deforming tail. This is an articulated collection of meshes, not a production skeleton with vertex skin weights.
2. The head's front surface has a genuine mouth opening with separate cavity, lip rim, teeth and tongue. Opening is adjustable. Eyelids are opaque spherical caps that advance down the eyes rather than fade in.
3. Idle, run, jump and eat previews; timeline scrubbing and playback speed. Camera presets, mouse/touch orbit and wheel zoom.
4. Purple, mint and clay studies, roughness settings, wireframe and local image texture loading. Uploaded files never leave the device. UVs are provisional; a finished painted character requires deliberate UV unwrapping and seam work.
5. Separate belly pump, backpack with three tube indicators and single-side cheek sensor. These are visual controls, not dosing logic, recommendations or a physiological simulation.
6. Three.js copied from the user's Hammerhajer project, retaining its MIT licence. No runtime CDN dependency. The bundled classic build logs its upstream deprecation warning; this first study deliberately reuses the local runtime rather than introducing a build system.

## Verification

1. `node tests/dex-3d.test.cjs`: passed 720 poses across four motions and three expressions. Checks actual Three.js vertex arrays for finite values, joint direction, loop closure, mouth limits, texture changes, visibility and standalone page dependencies. This does not prove visual quality.
2. `tests/dex-3d-browser.cjs`: passed in an isolated headless installed Chrome. Uses visible DOM controls, not internal model mutation. Tests motions, expressions, preset skins, an actual local image upload, gear, stock, mesh view and mouth limits; checks mobile horizontal overflow and browser errors.
3. In-app browser: inspected front eating pose, three-quarter idle and backpack rear view. No recorded JavaScript errors.
4. Saved screenshots: `tests/playwright/2026-09-06_dex-3d/`, including run 25/75, jump, eat, sleepy, mint, full/empty backpack, pump, mesh, mouth limits and 390px mobile layout. Main browser test viewport: 1440 × 1000. Manually inspected selected rendered screenshots after fixes.

## Findings / status

1. FIXED (2026-09-06): initial feet floated above the pedestal. Corrected root height so neutral soles meet the surface.
2. FIXED (2026-09-06): initially rotated lids resembled hinged plates. Replaced with changing spherical caps; increased cap depth so they occlude the pupils as well as the whites.
3. FIXED (2026-09-06): zero mouth setting still showed a large opening. It now becomes a narrow closed-mouth line, withdrawing teeth and hiding the tongue.
4. PARTIAL / art study: face is more toy-like than the original illustration. FIXED (2026-09-06, second pass): the front/back ridge now has matching edge vertices and analytical ellipsoid normals. Both halves use the same spherical UV mapping with the wrap seam on the rear medial line. Quill roots and facial forms still need sculpting for a production-quality likeness; arbitrary imported textures can still have mismatched image edges.
5. PARTIAL / motion study: running is in-place and not yet contact-solved against a moving floor. Tail motion is a delayed procedural wave, not the live game's spring physics. Expressions and chewing are concepts, not a full facial rig.
6. BY DESIGN: no production-game integration, model exporter, authored texture template, health inputs or treatment engine. User review of the likeness should precede integration.

Summary: isolated prototype delivered; controls and geometry tests passed. Remaining work is chiefly likeness, topology/UV quality and animation polish, not a claim that DEX is production-ready.

## Second pass — mouth, LED and side seam

1. Added four upper and four lower teeth: two fangs and two bevelled, flat incisors per jaw. Upper teeth are recessed 0.095 model units from the lip surface, with reduced fang depth. Teeth follow each jaw edge and retract when the mouth closes.
2. Extended the tongue's depth radius from 0.14 to 0.32 and moved its root inward. Replaced the convex black cavity sphere with an inward bowl so it no longer masks the tongue's inner portion.
3. Reduced the LED face from 0.117 × 0.129 to 0.072 × 0.080 model-unit radii. An unlit, non-tone-mapped material preserves saturated green at the pulse peak rather than whitening under studio lights. Existing orange/red/off preview modes are retained.
4. Rebuilt the rear surface to share the front's 80 edge segments, corrected front triangle winding, and assigned common analytical outward normals. Spherical UVs meet at the sides; the texture wrap is on the rear centreline. Generated spots wrap across texture edges. Denser sampling near the side profile reduces faceting.
5. `tests/dex-3d.test.cjs`: 720 poses passed, plus matching seam vertices/normals/wrapped UVs, upper/lower incisor counts, tooth setback across four mouth openings, tongue depth and saturated-green LED checks.
6. Browser regression passed without JavaScript errors. Screenshots saved separately under `tests/playwright/2026-09-06_dex-3d-refinement/`. Manually inspected front teeth, three-quarter open/closed mouth and the untextured clay side view to distinguish geometric shading from texture seams. The old side ridge is no longer visible in those checked views. Lower incisors remain visible beside the tongue; the closed pose hides the teeth.

## Third pass — shoes, hands and character behaviour

1. Darker teal shoe materials, separate tongue and cuff panels, toe seams, side stitches, lace eyelets, heel loops and eight rubber tread strips per shoe. Equipment materials remain unchanged.
2. Smaller palms and exactly two slim fingers plus a thumb per hand.
3. After four seconds idle, DEX periodically lifts a shoe and looks down at its sole. A later gesture turns towards the camera with an asymmetric brow lift and a small shrug. Both gestures fade in and out and have dedicated preview choices.
4. Running builds visual effort over 14 seconds; resting clears it over 18 seconds. Mouth opening, chest expansion and shoulder motion become stronger with effort. An integrated breathing phase avoids jumps when the breathing rate changes. This is visual activity only, with no new audio or physiology changes. It is not yet connected to the live game's cardio state.
5. PASS: 1,260 poses across seven motions and three expressions, plus shoe/hand structure, idle timing, effort accumulation/recovery at 30/60/144 FPS, continuous breathing phase and manual-mouth precedence checks.
6. PASS: isolated Chrome browser checks, including actual timed idle/run transitions, all seven motion choices, controls, local textures, equipment and 390px horizontal overflow. No JavaScript errors. Screenshots: `tests/playwright/2026-09-06_dex-3d-character/`.
7. Visually inspected the raised sole/downward gaze, camera-facing shrug, slim hands and two contrasting breathing phases. Existing production limitations above remain: in-place running, no ground-contact solver, and a procedural art study rather than a finished character rig.

## Fourth pass — glucose posture preview

1. Three anchored quills stand upright at fictional BG 4–10 and progressively droop below/above that range. Smoothstep reaches full droop at 2.5 or 19. These are visual game mappings, not clinical or dosing rules.
2. The tail gradually lowers and reduces its lateral swing with the same visual state. World-space floor clamping keeps vertices above the pedestal. This is procedural deformation, not a physically simulated dragging tail.
3. Added a fictional BG slider to the standalone workshop. No physiology, personal inputs or live-game integration; the existing lamp control remains independent and is labelled accordingly.
4. PASS: 1,260-pose regression plus quill-angle and tail-floor checks at eight BG values; browser regression without JavaScript errors. Side screenshots at 6, 2.5, 14 and 19 saved in the character test folder. Visually inspected upright and fully lowered silhouettes; the tail tip reaches the floor at full droop.

## Fifth pass — side-readable advanced backpack

1. Replaced rear-facing light strips with three volumetric vertical cylinders spaced along the backpack depth, visible in side profile. The same three stock states control their individual illumination.
2. Added brass collars, retaining rods, copper rivets and pipes, dark metal rails, valve wheels and two decorative side-facing gauges. No equipment behaviour or controller changed.
3. Geometry regression and browser checks passed. Side screenshot `05-backpack-side.png` shows all three cylinders separately, including two illuminated and one empty. The gauge was subsequently raised above the rail to avoid the body's silhouette.
