# BG HUD particle-flow validation

Scope: visual HUD only. No physiological equations or dosing rules changed.

1. PASS: 37 gameplay regression checks.
2. PASS: Chrome/WebGL at 1920 x 1080 and 1280 x 800, three BG states, no page errors.
3. PASS: closed valve holds particles upstream; opening releases particles downstream.
4. PASS: candy use and an accepted apple meal add their respective thumbnails.
5. Visual inspection: both thumbnails fit beneath the COB label inside the jar.

Screenshots: `tests/playwright/2026-09-06_bottom-hud/`, including
`queued-valve.png`, `released-valve.png`, and `food-miniatures.png`.

Limitation: particle counts, circulation and thumbnail fading are illustrative,
not a molecule-level simulation. This compact HUD still simplifies several
physiological routes; see `docs/BOTTOM-HUD.md`.
