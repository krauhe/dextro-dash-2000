# Stage 1 middle-layer artwork

Replaced only stage 1's middle image with `assets/parallax-orchard-clean.png`
(2172 x 724 RGBA). Original remains available for other stages. Height, anchoring,
scroll speed and level geometry are unchanged. High-quality downsampling enabled.

Built-in imagegen edit, using `parallax-mid-continuous-v2.png` as the edit target.
Prompt: repaint the same low tropical skyline as smooth high-resolution fantasy
platform-game art, with large coherent leaves, soft dark emerald/teal shading,
restrained highlights, transparent upper half and genuine gaps between fronds.
Keep continuous opaque vegetation and soil across the bottom. Remove glitter,
speckled holes, ragged mask edges and pale halos. No sky, text or checkerboard.

The output had baked checkerboard pixels; the authorised code cleanup is in
`tools/prepare-orchard-middle.cjs`. Inspected on a dark purple background: coherent
foliage, clear gaps and solid lower ground. No browser visual validation this turn.
