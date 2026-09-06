# Bottom HUD experiment

The playfield is moved upward by the former header height. World coordinates,
camera tracking, ground height, jumps, collisions and physiology are unchanged.
Score, stage, lives, time and discovered inventory now share the bottom panel.

The WebGL tank shows true blood glucose as a vertical liquid level, with the
existing low/high colours and alarm pulse. A Canvas fallback retains the glucose
reading if WebGL is unavailable. A/Z inventory discovery and pickup flights remain.

The food reservoir displays actual stomach plus gut carbohydrate pools (D1+D2,
converted from mmol to grams), rather than the engine's time-estimated COB. This
is a display-only choice; the pump still reads the unchanged engine state. Food
particles use the measured carbohydrate appearance rate. IOB remains displayIOB;
its level decreases with the engine's existing insulin kinetics.

The glass module is 190 logical pixels wide, and its BG tank is 72 pixels wide.
COB and IOB labels sit inside their reservoirs. Glucose liquid and particles stay
yellow; thick green, orange or pulsing red glass edges indicate BG status. The
IOB reservoir sits above the valve with a long transparent vertical connection.
The horizontal pipes align with the bottom of the reservoirs.

The side-view actuator is a qualitative, user-requested visual metaphor, not an
anatomical valve, treatment controller or mass-conserving fluid simulation.
Since the September 6 particle-cloud revision, visible insulin drops are gated
by displayed bolus IOB: values below 0.05 U round to 0.0 U and produce no new
drops. Any drops still in flight are cleared at that threshold. Each drop that
reaches the actuator produces one brief opening and a cloud through the aperture.
There is no separate clearance counter releasing individual particles.

Important limitation: IOB is not the same quantity as delayed insulin action.
This visual simplification does not imply that glucose uptake stops at zero
displayed bolus IOB. Basal insulin, liver production, background consumption,
renal loss and contraction-dependent muscle uptake remain in the unchanged
physiology engine. They affect true BG and its liquid level, but are not all
separately represented by this valve. No visual particle removes extra glucose
from the engine, and a blue drop does not represent a dose or a fixed quantity of
glucose. The animation must not be described as a complete physiological balance.
No dose advice or personal inputs exist.

Validation: gameplay regression suite; level-tool suite; browser screenshots at
normal, low and high BG, with inventory, at Full HD and a 1280-pixel viewport.

## Valve-local particle flow

`hud-particle-chamber.js` maintains 720 golden motes in one connected BG-liquid
and upstream-pipe region. Random motion, wall reflections and local pair contacts
replace the previous lanes and queue positions. The pipe is populated even while
the valve is closed. Insulin impacts only change the aperture: they apply no force
to the particles. Only particles that physically fit the sliding aperture can
pass, continuing their existing random motion. Escaped particles
accelerate through the outlet and fall below the display. A bounded pool recycles
them upstream; particle count is not a quantitative glucose measurement.

`bg-hud-renderer.js` renders the pool in one instanced GPU draw call. It shares the
golden hexagon/glow texture with DEX's muscle-uptake dust. A second instanced pool
uses the same movement and contact rules inside COB, with up to 150 particles
depending on reservoir contents. The liquid is translucent gold so the glowing
particles remain legible in both tanks, not just against the darker pipe. Glucose remains visible
at zero IOB; blue insulin drops do not. No food-inlet particles appear when the
COB display rounds to zero, even if a tiny residual absorption rate remains.

The visual drop interval is bounded (roughly one second at 1.25 displayed U), not
a dosing schedule. Each impact opens the valve over 0.07 s, holds it to 0.30 s,
then closes it by 0.50 s. An already triggered opening may finish after IOB falls
to zero. The timing belongs only to animation, never to pump logic or ODEs.

Accepted meals add a small food image inside the COB jar. Up to four recent
images fade over 20 seconds of game time; this is a visual history, not a claim
that each meal is absorbed in exactly that interval. Stored candy does not appear
until eaten. Restarting clears the images and resets particles and valve timing.

Focused verification: `tests/hud-valve.test.cjs`,
`tests/hud-particle-chamber.test.cjs`, `tests/hud-liquid.test.cjs` and
`tests/bottom-hud-browser.cjs`. The browser test observes a falling drop, the first
opening and particle cloud, followed by a settled zero-IOB state. It also checks
low/normal/high BG and renders Full HD, laptop and narrow viewports.
