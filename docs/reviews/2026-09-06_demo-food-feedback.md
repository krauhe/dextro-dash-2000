# Food, insulin feedback and attract demos

Implemented locally for approved request #37, continued as #43.

1. Insulin-use feedback shares turquoise particle artwork with the HUD; the expanding ring was removed. Existing pickup flight and held-item feedback remain.
2. Campaign enrichment adds candy or existing stage-roster food monsters on open supported ground. Placement excludes low ceilings, nearby pickups and patrols. Pump rarity remains unchanged.
3. Attract mode cycles between random exploration and two isolated fictional demonstrations: food followed by rest, and insulin followed by rest. The actual engine processes contact and subsequent physiology. Captions only announce rising/falling BG after an observed change; no dose recommendation is shown.
4. Demonstrations do not modify the playable campaign layout. Starting play restores a normal level and steady-state BG.

## Verification

- 43 gameplay regression checks passed, including pump inventory, alarms, movement, resets and demo entry.
- Level schema, ground support, progression and reward-coupling checks passed.
- Pump rarity checks passed for all ten stages across three seeds.
- Engine smoke test passed at BG 6.
- Dedicated demo tests: food BG 4.40 to 6.74; insulin BG 11.00 to 8.48, using normal accelerated simulation and resting DEX. These are fictional test outputs, not clinical targets.
- Browser checks passed without errors; food/rest and insulin/contact/rest screenshots inspected. Captions moved above the play action to avoid covering DEX. Evidence: `tests/playwright/2026-09-06_demo-lessons/`.

Full campaign balance and complete live-physiology playthroughs remain unverified. No physiology parameters or valve-action rules changed. The separate #41 decision remains open. No commit or push performed.
