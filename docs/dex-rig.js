/* Ren animationsmatematik for værkstedet. Ingen DOM, fysiologi eller spilstate.
   Koordinater: 100 enheder højt kildebillede, fødder ved y=-8, højre er +x.
   Samme funktioner kan testes i Node og senere bruges af en produktionsrig. */
(function(root){
    'use strict';
    const layerNames=['tail','backArm','legs','body','frontArm','equipment','cgm'];
    function defaults(){return {animation:'run',facing:1,equipment:'pump',stock:3,lamp:'green',speed:1,
        layers:Object.fromEntries(layerNames.map(name=>[name,true])),
        parts:Object.fromEntries(['frontArm','backArm','pump','backpack','cgm'].map(name=>[name,{x:0,y:0,scale:1}]))};}
    function pose(animation,phase){
        const t=((phase%1)+1)%1, wave=Math.sin(t*Math.PI*2);
        const run=animation==='run', jump=animation==='jump', eat=animation==='eat';
        return {phase:t,bodyLift:jump?Math.sin(t*Math.PI)*20:run?Math.abs(wave)*1.2:Math.sin(t*Math.PI*2)*0.4,
            stride:run?wave*0.48:jump?-0.25:0, armSwing:run?wave*0.62:jump?-0.9:eat?-0.9*Math.sin(t*Math.PI):0.08*wave,
            bodyImage:eat?(t>0.25&&t<0.65?'devour':'eat'):'idle',
            bite:eat?Math.max(0,Math.sin(t*Math.PI)):0,tail:wave*(run?8:3)};
    }
    function exportRig(settings){return {format:'dextro-visual-rig-v1',coordinateSpace:'100-unit sprite; origin at feet',
        prototype:true,settings:JSON.parse(JSON.stringify(settings))};}
    const api={layerNames,defaults,pose,exportRig};
    if(typeof module!=='undefined'&&module.exports)module.exports=api;
    else root.DexRig=api;
})(globalThis);
