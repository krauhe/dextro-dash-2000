/*
 * GENERATE-LEVEL.CJS — deterministiske banekladder, ikke automatisk publicering.
 * Faste frø gør ruter reproducerbare. Kladder skal stadig gennemgås/spiltestes.
 * Eksempel: node tools/generate-level.cjs --stage 3 --seed 42 --out draft.json
 * En JSON-kladdes tema er kun et designønske, indtil renderer-støtte er tilføjet.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const option = (name, fallback) => {
    const index = args.indexOf(`--${name}`);
    return index < 0 ? fallback : args[index + 1];
};
const stage = Number(option('stage', 1));
let seed = Number(option('seed', 42));
const initialSeed = seed;
const output = option('out', null);
if (!output || !Number.isInteger(stage) || stage < 1 || !Number.isInteger(seed)) {
    throw new Error('Required: --stage positive-integer --seed integer --out new-draft.json');
}
const random = () => {seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296;};
const chunks = Math.min(8, 3 + stage);
const level = {
    name: `Stage ${stage} draft`, seed: initialSeed,
    themeProposal: ['Jungle ruins', 'Moonlit crystal caves', 'Copper clockwork'][Math.min(stage-1,2)],
    draft: true, width: chunks*640, groundY:154, finishX:chunks*640-72,
    platforms:[], items:[], diamonds:[], enemies:[],
};
for (let chunk = 0; chunk < chunks; chunk++) {
    const start = chunk*640;
    level.platforms.push({x:start,y:154,width:chunk===chunks-1?640:600,height:22});
    // En sammenhængende trappe med overlappende landingsflader. De øverste
    // plateauer er valgfrie, så høj BG ikke tvinger en låst rute på spilleren.
    for (let step=0; step<Math.min(4,stage+1); step++) {
        const x=start+160+step*58, y=126-step*26;
        level.platforms.push({x,y,width:68,height:12});
        level.diamonds.push([x+28,y-14],[x+48,y-14]);
        if (step===0 || random()<0.5) level.items.push({type:'insulin',x:x+28,y:y-14});
    }
    const kinds = stage===1?['cake']:stage===2?['cake','soda']:['cake','soda','pizza'];
    const type = kinds[chunk % kinds.length];
    const x=start+420;
    level.enemies.push({type,x,y:140,minX:start+390,maxX:start+555,
        speed:22+Math.min(stage,6)*2,carbs:{cake:30,soda:20,pizza:24}[type]});
    level.diamonds.push([x+12,139],[start+70,130]);
    level.items.push({type:'candy',x:start+95,y:140});
}
if (stage>=2) level.items.push({type:'pump',x:108,y:140});
if (stage>=3) level.items.push({type:'autoPump',x:level.width/2+110,y:140});
// 'wx' beskytter eksisterende kladder mod utilsigtet overskrivning.
fs.writeFileSync(path.resolve(output), JSON.stringify(level,null,2)+'\n', {flag:'wx'});
console.log(`Created ${output}: ${level.platforms.length} platforms / ${level.enemies.length} enemies. Review before integration.`);
