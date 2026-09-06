/* Kontrollerer den fælles kampagne/generator: højst én pumpe og ingen i kassepuljen. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={};vm.createContext(context);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../campaign.js'),'utf8')+';globalThis.build=buildDextroStage;',context);
for(let stage=0;stage<10;stage++)for(const seed of [42,2000+stage,9123]){
    const level=context.build(stage,seed);
    const pumps=level.items.filter(item=>['pump','autoPump'].includes(item.type));
    assert(pumps.length<=1,`stage ${stage+1}: too many pumps`);
    assert(!level.blocks.some(block=>['pump','autoPump'].includes(block.reward)));
    if(stage>=8)assert.equal(pumps[0]?.type,'autoPump');
}
console.log('PASS pump rarity: all 10 stages, 3 seeds, no pump cache rewards');
