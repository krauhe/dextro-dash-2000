/* Banekladders determinisme, schema og eksisterende monsterprogression. */
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'dextro-level-check-'));
const generated=[];
for(const stage of [1,2,3,3]){
    const file=path.join(folder,`draft-${generated.length}.json`);
    execFileSync(process.execPath,[path.join(root,'tools/generate-level.cjs'),'--stage',String(stage),'--seed','42','--out',file]);
    const level=JSON.parse(fs.readFileSync(file,'utf8'));generated.push(level);
    assert.equal(level.draft,true);assert.ok(level.finishX<level.width);
    for(const p of level.platforms){assert.ok(p.x>=0&&p.x+p.width<=level.width);assert.ok(p.y>=30&&p.y<=level.groundY);}
    for(const e of level.enemies){
        assert.ok(level.platforms.some(p=>p.y===level.groundY&&e.minX>=p.x&&e.maxX+22<=p.x+p.width));
        assert.equal(e.y+14,level.groundY);
    }
    for(const item of level.items)assert.ok(['candy','insulin','pump','autoPump'].includes(item.type));
    assert.ok(level.diamonds.some(([x,y])=>level.items.some(i=>i.type==='insulin'&&i.x===x&&i.y===y)));
}
assert.deepEqual([...new Set(generated[0].enemies.map(e=>e.type))],['cake']);
assert.deepEqual([...new Set(generated[1].enemies.map(e=>e.type))],['cake','soda']);
assert.deepEqual([...new Set(generated[2].enemies.map(e=>e.type))],['cake','soda','pizza']);
assert.deepEqual(generated[2],generated[3]);
const png=fs.readFileSync(path.join(root,'assets/candy-spin.png'));
assert.equal(png.readUInt32BE(16),1536);assert.equal(png.readUInt32BE(20),768);
assert.equal(png[25],6,'Candy atlas must have actual RGBA pixels, not baked checkerboard RGB');
console.log('Level tools: deterministic drafts, schema, patrol ground, progression, reward coupling and RGBA atlas checks passed.');
console.log(`Temporary evidence: ${folder}`);
