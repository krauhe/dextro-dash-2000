/* Read-only muskelstøv: optag styrer mængden, stop dæmper og pause fryser. */
const assert=require('node:assert/strict');
require('../glucose-particles.js');
const pose=Object.freeze({x:30,y:154});
function run(rate){const dust=DexGlucoseParticles.createDust();for(let i=0;i<120;i++)dust.update(1/60,rate,pose);return dust;}
assert.equal(run(0).count,0);
const slow=run(.3),fast=run(1.5);
assert(fast.count>slow.count*2);
const before=fast.count;fast.update(0,0,pose);assert.equal(fast.count,before);
for(let i=0;i<240;i++)fast.update(1/60,0,pose);
assert.equal(fast.count,0);
assert.equal(DexGlucoseParticles.flowRate(1.5),5*DexGlucoseParticles.flowRate(.3));
assert(run(100).count<=800,'finite population even at synthetic extreme input');
slow.reset();assert.equal(slow.count,0);
assert.equal(run(NaN).count,0);
console.log('PASS muscle dust: zero uptake, rate, pause, decay, cap, reset and invalid input');
