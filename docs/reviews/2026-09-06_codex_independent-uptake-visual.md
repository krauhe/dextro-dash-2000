# Insulin-independent uptake: focused visual-design review

Date: 2026-09-06. Scope: explaining the existing HUD and proposing an activity
effect. No gameplay, rendering or model code changed. This is not a full model
validation or a parameter-calibration review.

## 1. NOTE: Hidden basal insulin is not absent insulin

**Files:** `game.js:440`, `engine/hovorka.js:629`.
The game initializes fasting steady state at BG 6. Basal insulin and endogenous
glucose production remain in the engine. Insulin-independent F01c consumption
does not cancel basal insulin: both consumption routes remove glucose, while
endogenous production supplies it. A balanced resting state does not imply
pairwise cancellation or a fixed balance during activity.

**Status:** BY DESIGN - retain this simplification in controls, not as a claim
that the omitted visual flows are absent from physiology.

## 2. WARNING: One insulin-controlled outlet conflates distinct routes

**Files:** `game.js:2110`, `engine/hovorka.js:629`,
`engine/hovorka.js:642`, `engine/physiology-engine.js:3137`.
At the time of review, the HUD outlet combined positive net Q1-to-Q2 transport,
F01c and renal excretion, then visually gated the aggregate with insulin action. This can
incorrectly imply that every glucose sink requires insulin.

The separate contraction sink is beta * E1 [mmol/min], acting on Q2, not an
additional instantaneous drain of plasma Q1. It already affects the modeled BG
through the coupled compartments. Adding it again to BG subtraction, or simply
adding it to the present aggregate outlet as an exact mass balance, risks double
counting. F01c covers insulin-independent tissues, not only the brain.

**Status:** OPEN - proposal only: separate activity feedback from insulin-valve
feedback; keep unobtrusive basal turnover independent of valve opening. A fully
quantitative HUD would also need explicit source/storage and renal accounting.

**Follow-up, 2026-09-06, responses #29-30:** The particle renderer no longer uses
the aggregate clearance rate or basal-relative action to dispatch motes. At the
owner's request it illustrates displayed-IOB drops opening a valve; particles
move randomly through the aperture without an impact force. This fixes the
visible zero-IOB dripping and queue behaviour, but does not resolve the broader
physiological attribution warning. `docs/BOTTOM-HUD.md` now explicitly documents
that basal and insulin-independent turnover continue in the engine even when
this illustrative valve is closed. No model state or pump algorithm changed.

## 3. Proposed activity cue

Gold glucose motes move toward DEX's working legs and disappear into them. A
brief sparkling trail then fades behind his feet. This represents uptake/use,
not intact sugar being excreted through skin. Match the gold of HUD glucose;
retain turquoise for insulin. Drive density from beta * E1, rather than raw
speed or heart rate alone. Let it fade with E1 after stopping; retain the
separate pulse-driven panting animation. Do not force the BG arrow downward:
the net result still depends on all engine sources and sinks.

**Status:** IMPLEMENTED LOCALLY (2026-09-06), after owner approval in response
#24. `glucose-particles.js` shares the gold hexagonal glow glyph between HUD
and muscle dust. `game.js` reads beta * E1 without changing physiological state.
Browser observations: 0 motes at rest, 13 after six seconds running, 2 after
three seconds recovery. Unit tests cover pause, zero input, rate, decay, cap and
reset; 42 gameplay checks pass. The separate outlet-attribution issue in section
2 remains open; this visual change does not introduce a quantitative bypass.

## Mechanistic evidence and limits

Lund, Holman, Schmitz and Pedersen (1995), PMID 7597034, investigated isolated
rat soleus muscle. Inhibition of PI3K suppressed insulin-stimulated transport
and GLUT4 translocation but spared the contraction response. This supports
distinct stimulation pathways, not a game particle rate or a human treatment
effect. Only the abstract was verified; no calibration claim is made.

[Verified Europe PMC source record](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:7597034%20AND%20SRC:MED&format=json&resultType=core)
returned HTTP 200 locally, with matching title, authors and abstract.
PMC/PubMed web pages returned browser challenges in the browsing tool.
Local source notes: `docs/references/Lund_1995_ContractionGLUT4_Source.md`.

Summary: one intentional simplification, one open visual attribution issue,
one implemented animation. Follow-up testing concerns visual integration and
gameplay regression, not new physiological calibration or clinical validation.
