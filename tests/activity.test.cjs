/*
 * ACTIVITY.TEST.CJS — arkade/controller-kontrakt og fysiologiske mekanismer.
 * Sammenligner samme importerede motor med og uden bevægelsesinput.
 * Dette er integrations-/mekanismetests, ikke klinisk validering.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const sandbox=vm.createContext({console,Math,Date});sandbox.window=sandbox;
for(const file of ['engine/hovorka.js','engine/physiology-engine.js','dex-activity.js'])
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
function create(){
    const engine=sandbox.T1DPhysiologyEngine.createEngine({weight:70,isf:3,icr:10},
        {noise:false,seed:1987,modules:{dawn:0,dawnVariability:0,stressResponse:0,glucotoxicity:0,
            ketones:0,sleepDisruption:0,cgmSensorFaults:false,insulinVariability:0,fatProtein:true,ffaResistance:1}});
    engine.initSteadyState({targetBG:6});engine.consumeEvents();
    return {engine,controller:new sandbox.DexActivity(engine)};
}
function sample(e){const s=e.getPhysiologySnapshot();return {
    bg:e.trueBG,hr:e.smoothHeartRate,e1:s.exercise.e1,
    pulse:1+Math.max(0,(e.smoothHeartRate-e.hovorka.HR_base)/e.hovorka.HR_base)*.5,
    iob:e.getState().iob,
    rapidDepot:e.activeFastInsulin.reduce((sum,dose)=>sum+dose.s1+dose.s2,0)/1000,
    sessions:e.activeMotion.length,
};}
function scenario(mode,dt=1/15,bolus=false){
    const {engine:e,controller:c}=create();if(bolus)e.addRapidInsulin({units:1});
    for(let i=0;i<Math.round(30/dt);i++){
        c.update({moving:mode!=='rest',superShoes:mode==='high'});e.step(dt);
    }
    return sample(e);
}
const results={};
for(const mode of ['rest','medium','high'])results[mode]=scenario(mode);
assert(Math.abs(results.rest.bg-6)<.03,'rest remains steady');
assert(results.medium.e1>0 && results.high.e1>results.medium.e1,'actual muscle stimulus');
assert(results.medium.pulse>1 && results.high.pulse>results.medium.pulse,'existing absorption factor responds');
assert(results.medium.bg<results.rest.bg,'running changes actual BG');
// Nettoretningen sammenlignes i den faste DEX-protokol, ikke som universel regel.
assert(results.high.bg<results.medium.bg,'high cardio in this fixed protocol lowers BG more');
for(const mode of ['rest','medium','high']){
    const fine=scenario(mode,1/30);
    assert(Math.abs(results[mode].bg-fine.bg)<.03,`${mode}: timestep convergence`);
}
{
    const {engine:e,controller:c}=create(),{engine:direct}=create();
    c.update({moving:true});direct.startActivity({type:'cardio',intensity:'Medium',durationMin:null});
    for(let i=0;i<300;i++){c.update({moving:true});e.step(.1);direct.step(.1);}
    assert.equal(e.trueBG,direct.trueBG,'no extra BG subtraction beyond engine API');
    assert.equal(e.activeMotion.length,1,'one session, not one per frame');
    const before=Array.from(e.hovorka.state),hr=e.smoothHeartRate;
    c.stop();assert.deepEqual(Array.from(e.hovorka.state),before,'stop changes input, not ODE state');
    assert.equal(e.smoothHeartRate,hr,'heart rate does not reset');
    e.step(.1);assert.equal(e.hovorka.exerciseInput,0);
    assert(e.getPhysiologySnapshot().exercise.e1>0,'muscle recovery remains');
    c.update({moving:true,superShoes:true});assert.equal(e.activeAktivitet.intensitet,'Høj');
    assert.equal(e.activeMotion.length,2);
    c.stop();c.update({moving:true});assert.equal(e.activeAktivitet.intensitet,'Medium');
}
{
    const {engine:e,controller:c}=create();
    c.update({moving:true});e.step(241); // Motorens automatiske 4-timers stop.
    assert.equal(e.activeAktivitet,null);
    c.update({moving:true});assert(e.activeAktivitet,'long-stage movement is not silently ignored');
    c.stop();assert.equal(e.activeAktivitet,null);
}
// Ingen kontraktionsoptag uden E1. Ablation ændrer kun beta i testkopien.
{
    const {engine:e,controller:c}=create();e.hovorka.beta=0;
    for(let i=0;i<450;i++){c.update({moving:true});e.step(1/15);}
    results.noContraction=sample(e);
    assert(results.noContraction.bg>results.medium.bg,'direct muscle uptake has a separate contribution');
}
results.bolus={rest:scenario('rest',1/15,true),medium:scenario('medium',1/15,true),high:scenario('high',1/15,true)};
assert(results.bolus.high.rapidDepot<results.bolus.medium.rapidDepot && results.bolus.medium.rapidDepot<results.bolus.rest.rapidDepot,
    'exercise accelerates disappearance from rapid depot in matched protocol');
{
    const {engine:e,controller:c}=create();e.addRapidInsulin({units:1});
    const absorb=e._substepRapidInsulin;
    // Kun den hurtige insulins perfusionsfaktor ablateres; E1 og følsomhed
    // bruger stadig arbejdspulsen. Motorfilen ændres aldrig af eksperimentet.
    e._substepRapidInsulin=function(dt){const hr=this.hovorka.heartRate;
        this.hovorka.heartRate=this.hovorka.HR_base;
        try{absorb.call(this,dt);}finally{this.hovorka.heartRate=hr;}};
    for(let i=0;i<450;i++){c.update({moving:true});e.step(1/15);}
    results.noRapidPerfusion=sample(e);
    assert(Math.abs(results.noRapidPerfusion.rapidDepot-results.bolus.rest.rapidDepot)<1e-10,
        'rapid depot acceleration is owned by perfusion, not an extra game effect');
}
{
    const {engine:e,controller:c}=create();
    for(let cycle=0;cycle<20;cycle++){
        for(let i=0;i<15;i++){c.update({moving:true});e.step(1/15);}
        c.stop();for(let i=0;i<15;i++)e.step(1/15);
    }
    assert(Math.abs(e.totalExerciseMinutes-20)<1e-7,'rests are not counted as exercise');
    assert.equal(e.activeMotion.length,20,'one record per bout, no duplicate sessions');
    assert(e.activeMotion.every(m=>m.duration>.99999 && m.duration<1.00001));
}
console.log(JSON.stringify(results,null,2));
console.log('PASS activity mapping, recovery, no duplicate effect, session lifecycle, ablation and two timesteps.');
