# Compact glass HUD — visual verification

1. **Fixed: label placement.** COB and IOB are inside their glass reservoirs.
   Checked with stocked inventory and BG 3.3, 6 and 16 at Full HD and 1280 width.
2. **Fixed: disconnected flow.** Inlet particles stay within the inlet channel.
   Outlet particles use the valve gap, including particle radius, and fall below
   the canvas after the pipe end. The geometry sweep passed for five action
   values and 500 progress samples each. Closed, basal and wide-open valve
   states were rendered at three animation times and visually inspected.
3. **Fixed: insulin placement.** The reservoir is above the sliding plates with
   a blue connecting rod. Delayed model action still drives opening, not IOB
   directly. No engine or controller changes were made.
4. **OK:** 37 gameplay regressions pass. Browser test reports no page errors.
5. **Scope limitation:** This remains a compact explanatory graphic; particle
   counts are qualitative and not a mass-conserving fluid model.

Evidence: `tests/playwright/2026-09-06_bottom-hud/`, especially
`valve-3-0.7.png`, and `tests/bottom-hud-browser.cjs`.
