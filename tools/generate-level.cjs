/* Reproducerbare banekladder fra præcis samme fabriksfunktion som spillet.
 * Generatoren publicerer intet og overskriver aldrig en eksisterende kladde. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const args=process.argv.slice(2);
const option=(name,fallback)=>{const i=args.indexOf('--'+name);return i<0?fallback:args[i+1];};
const stage=Number(option('stage',1)),seed=Number(option('seed',42)),output=option('out',null);
if(!output||!Number.isInteger(stage)||stage<1||stage>10||!Number.isInteger(seed))
    throw Error('Required: --stage 1..10 --seed integer --out new-draft.json');
const scope={};vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../campaign.js'),'utf8')+'\nthis.build=buildDextroStage;',scope);
const level=scope.build(stage-1,seed);level.draft=true;
fs.writeFileSync(path.resolve(output),JSON.stringify(level,null,2)+'\n',{flag:'wx'});
console.log(`Created ${output}: ${level.name}. Inspect and playtest before integration.`);
