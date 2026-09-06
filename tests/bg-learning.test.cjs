/* Faste, modeldrevne BG-scener: enhedstest af data og adskilte visuelle signaler.
 * Ingen klinisk validering. Motoren og de eksisterende spilregler ændres ikke. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),scope={console};scope.window=scope;vm.createContext(scope);
for(const file of ['engine/hovorka.js','engine/physiology-engine.js','campaign.js','docs/bg-learning-data.js'])
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),scope,{filename:file});
const api=scope.DexBGLearning,data={};
for(const name of Object.keys(api.cases)){
    const frames=api.record(name);data[name]=frames;
    assert.equal(frames.length,721);
    for(const frame of frames) for(const [key,value] of Object.entries(frame))assert.ok(Number.isFinite(value),`${name}: ${key}`);
    for(const frame of frames) for(const key of ['cob','iob','food','liver','muscle','insulinClearance'])assert.ok(frame[key]>=0);
    assert.ok(Math.abs(frames[0].bg-6)<.01);
}
assert.ok(data.balance.every(f=>Math.abs(f.bg-6)<.01&&f.cob===0&&f.iob===0&&f.liver>0&&f.background>0));
assert.ok(data.food[160].bg>data.food[0].bg+.5);
assert.ok(data.insulin[0].iob>.99&&data.insulin[0].action<1.001,'amount appears before action');
assert.ok(data.insulin[400].iob<data.insulin[160].iob&&data.insulin[400].action>data.insulin[160].action,
    'declining IOB is not declining instantaneous action');
assert.ok(data.insulin[720].bg<data.food[720].bg);
assert.ok(data.run[160].muscle>.1&&data.food[160].muscle===0);
assert.equal(data.run[400].running,0);
assert.ok(data.run[160].bg<data.food[160].bg);
assert.ok(data.food[720].cob>0&&data.food[720].hudCOB===0,'reservoir retains the actual absorption tail');
const a=api.sample(data.insulin,20.125),b=data.insulin[80],c=data.insulin[81];
assert.ok(Math.abs(a.bg-(b.bg+c.bg)/2)<1e-12);
assert.deepEqual(api.record('insulin'),data.insulin);
console.log('BG workshop: four deterministic scenes, 2,884 finite samples, steady fluxes, separate IOB/action, gut tail and exercise passed.');
