# Shared particle-rate display

Decision #58, 2026-09-06. Display-only change; no engine parameters or glucose subtraction changed.

Both sources use 4 displayed particles per real second for an input rate of 1 mmol/min. This arbitrary common scale preserves their input-rate ratio at the fixed game time scale; it is not molecular counting.

- Muscle input: beta * E1, the contraction uptake term.
- Valve input: max(0, x2 - initial steady-state x2) * current Q2. This is an approximation of extra disposal above the initial basal action at the current tissue glucose amount, not a separate bolus-only counterfactual simulation. It excludes Q1 transport and hepatic effects.
- Valve input is graphically zero below displayed IOB .05 U, per user decision. Actual model action remains untouched.
- A fractional exit budget accumulates; particles still need to cross the valve physically. No global rightward impulse. Thus the budget is proportional, but visible short-window counts can lag it. Budget is discarded when the displayed flow becomes zero.
- Muscle dust no longer has its own saturating rate cap, which would distort the ratio.

Zero-IOB valve regression passed. Shared scale and dust behavior tested separately. Full visual/playthrough validation outstanding; this is not a complete glucose mass-balance illustration.

Open-valve chamber check over 120 real seconds: a 0.2 particle/s input released 23 particles; 0.4 released 47 (budgets 24 and 48). The remaining fraction/event waits for a physical crossing. This checks a constant open valve, not every gameplay pulse pattern.
