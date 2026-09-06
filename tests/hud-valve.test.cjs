/* IOB-illustration: ét synligt dryp giver én afgrænset ventilpuls. */
const assert=require('node:assert/strict');
require('../bg-hud-renderer.js');
function run(iob,dt=1/60){
 const drive=DexBGHUD.createValveDrive();let state,maxGap=0,openFrames=0,closedFrames=0;
 for(let t=0;t<12-1e-6;t+=dt){state=drive.update(iob,dt);maxGap=Math.max(maxGap,state.gap);if(state.gap>0)openFrames++;else closedFrames++;}
 return {drive,state,maxGap,openFrames,closedFrames};
}
for(const iob of [0,.001,.049,NaN]){
 const result=run(iob);assert.equal(result.state.impacts,0);assert.equal(result.maxGap,0);assert.equal(result.state.drops.length,0);
}
const normal=run(1.25),small=run(.1),strong=run(3);
assert(strong.state.impacts>normal.state.impacts);assert(normal.state.impacts>small.state.impacts);
assert.equal(normal.maxGap,1.4);assert(normal.openFrames>0&&normal.closedFrames>0,'distinct open/closed pulses');
const first=DexBGHUD.createValveDrive();let priorImpacts=0;
for(let frame=0;frame<180;frame++){
 const s=first.update(1.25,1/60);
 if(!s.impacts)assert.equal(s.gap,0,'no opening before visible impact');
 if(s.impacts>priorImpacts)assert(s.flash>.9,'impact flash coincides with drop');
 priorImpacts=s.impacts;
}
assert.deepEqual(normal.drive.update(1.25,0),normal.state,'pause freezes actuator');
let stopped;for(let i=0;i<90;i++){stopped=normal.drive.update(0,1/60);assert.equal(stopped.drops.length,0);}
assert.equal(stopped.gap,0);assert.equal(stopped.impacts,normal.state.impacts,'zero IOB cannot launch another pulse');
normal.drive.reset();assert.deepEqual(normal.drive.update(0,0),run(0).state);
assert.equal(run(1.25,1/30).state.impacts,run(1.25,1/120).state.impacts);
console.log('PASS valve: displayed-zero IOB, one drop/one pulse, full closure, pause, reset and frame rates');
