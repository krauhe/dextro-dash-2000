/* Banekladders determinisme, schema og eksisterende monsterprogression. */
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'dextro-level-check-'));
const generated=[];
for(const stage of [1,2,3,4,5,6,7,8,9,10,10]){
    const file=path.join(folder,`draft-${generated.length}.json`);
    execFileSync(process.execPath,[path.join(root,'tools/generate-level.cjs'),'--stage',String(stage),'--seed','42','--out',file]);
    const level=JSON.parse(fs.readFileSync(file,'utf8'));generated.push(level);
    assert.equal(level.draft,true);assert.ok(level.finishX<level.width);
    assert.deepEqual([...new Set(level.enemies.map(e=>e.type))].sort(),[...level.roster].sort());
    for(const p of level.platforms){assert.ok(p.x>=0&&p.x+p.width<=level.width);assert.ok(p.y>=30&&p.y<=level.groundY);}
    for(const e of level.enemies){
        const supported=(from,to)=>{
            let covered=from;
            for(const p of level.platforms.filter(p=>p.y===e.y+14).sort((a,b)=>a.x-b.x)) {
                if(p.x<=covered&&p.x+p.width>=covered)covered=p.x+p.width;
            }
            return covered>=to;
        };
        assert.ok(supported(e.x,e.x+22),`${stage} ${e.type} starts on ground`);
        if(!e.eggDrop)assert.ok(supported(e.minX,e.maxX),`${stage} ${e.type} patrol`);
    }
    for(const item of level.items)assert.ok(['candy','insulin','pump','autoPump','sugarCane'].includes(item.type));
    assert.ok(level.blocks.some(b=>b.reward==='monster'));
    for(const block of level.blocks) {
        assert.ok(['diamonds','candy','pump','autoPump','monster'].includes(block.reward));
        if(block.reward==='monster')assert.ok(level.roster.includes(block.monsterType));
    }
    assert.ok(level.diamonds.some(([x,y])=>level.items.some(i=>i.type==='insulin'&&Math.abs(i.x-x)<=8&&i.y===y)));
}
assert.deepEqual([...new Set(generated[0].enemies.map(e=>e.type))],['apple']);
assert.deepEqual([...new Set(generated[1].enemies.map(e=>e.type))],['apple','egg']);
assert.deepEqual(generated[9],generated[10]);
for(const name of ['apple','egg','banana','avocado','burger','pizza']){
    const data=fs.readFileSync(path.join(root,`assets/food-${name}.png`));
    assert.equal(data[25],6,`${name} needs real alpha`);
}
for(const name of ['cellar','cave','mountain','volcano','ice']) assert.ok(fs.existsSync(path.join(root,`assets/biome-${name}.png`)));
const png=fs.readFileSync(path.join(root,'assets/candy-spin.png'));
assert.equal(png.readUInt32BE(16),1536);assert.equal(png.readUInt32BE(20),768);
assert.equal(png[25],6,'Candy atlas must have actual RGBA pixels, not baked checkerboard RGB');
console.log('Level tools: deterministic drafts, schema, patrol ground, progression, reward coupling and RGBA atlas checks passed.');
console.log(`Temporary evidence: ${folder}`);
