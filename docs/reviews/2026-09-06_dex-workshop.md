# DEX Workshop verification

Date: 2026-09-06. Scope: separate visual development tool, not the game renderer.

1. PASS: six local source images loaded through the local HTTP server. No engine, physiological settings or treatment calculations are loaded by the workshop.
2. PASS: browser pause held the frame, and Next frame advanced frame 45 to 46. Direction changed to left, correctly hiding the one-sided CGM. The backpack and its three visual stock bars rendered.
3. PASS: separate-layers and attachment-point toggles visibly separated arms, body, legs and equipment. Both large preview and game-size preview use the same assembly function. Browser error log remained empty.
4. PASS: Node tests cover independent settings objects, 240 finite animation poses, loop endpoints, run stride reversal and export isolation. All 32 gameplay tests, level-tool tests and engine smoke test passed before publication.
5. FIXED: the initial lamp-pair expression had an invalid unary/exponent combination; syntax check caught it before browser testing.
6. PROTOTYPE LIMIT: body/leg crops are provisional and expose seams or residual neighbouring pixels in separated view. Face expressions still come from complete body poses. Arms and tail are code-drawn motion sketches, not final rendered assets or the game's inertial tail.
7. NOT TESTED: browser download delivery, all responsive viewport sizes and every equipment/animation combination. Export data is unit-tested. Rig settings are not automatically applied to gameplay and there is no import or persistent-save feature yet.

Screenshots were inspected in the working conversation. Full campaign balancing remains a separate open task.
