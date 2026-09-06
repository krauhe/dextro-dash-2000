/* Værkstedets rigdata og bevægelse testes uden browser eller fysiologimotor. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const rig=require('../docs/dex-rig.js');
const original=rig.defaults(),other=rig.defaults();
other.parts.cgm.x=5;assert.equal(original.parts.cgm.x,0);
for(const animation of ['idle','run','jump','eat'])for(let frame=0;frame<60;frame++){
    const pose=rig.pose(animation,frame/60);
    for(const value of Object.values(pose))if(typeof value==='number')assert.ok(Number.isFinite(value));
    assert.ok(['idle','eat','devour'].includes(pose.bodyImage));
}
assert.deepEqual(rig.pose('run',0),rig.pose('run',1));
assert.ok(rig.pose('run',.25).stride>0);assert.ok(rig.pose('run',.75).stride<0);
assert.equal(rig.pose('eat',.5).bodyImage,'devour');
const saved=rig.exportRig(original);saved.settings.parts.pump.x=20;assert.equal(original.parts.pump.x,0);
assert.equal(saved.format,'dextro-visual-rig-v1');
const html=fs.readFileSync(path.join(__dirname,'../docs/dex-workshop.html'),'utf8');
assert.ok(!html.includes('physiology-engine.js'));assert.ok(!html.includes('game.js'));
console.log('DEX rig: independent defaults, 240 poses, loop, export and standalone page passed.');
