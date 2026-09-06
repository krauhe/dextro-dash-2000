/* Visuelle bølger: middelhøjde, dæmpning, pause og lave beholdninger. */
const assert=require('node:assert/strict');
require('../bg-hud-renderer.js');
const wave=DexBGHUD.createSlosh();
const amplitude=()=>Math.max(...Array.from({length:101},(_,i)=>Math.abs(wave.sample(i/100))));
wave.update(3,0);const quiet=amplitude();
wave.update(7,.016);assert(amplitude()>quiet*3);
let mean=0;for(let i=0;i<100;i++)mean+=wave.sample(i/100);
assert(Math.abs(mean)<1e-9,'wave does not change mean liquid level');
const before=wave.sample(.23);wave.update(7,0);assert.equal(wave.sample(.23),before);
for(let i=0;i<400;i++)wave.update(7,.02);
assert(amplitude()<.12,'disturbance settles');
wave.update(.04,.016);
assert(amplitude()<.04,'surface never crosses tank bottom');
wave.reset();wave.update(7,0);assert(amplitude()<.12,'no initial splash');
console.log('PASS liquid waves: impulse, zero mean, pause, damping, low fill and reset');
