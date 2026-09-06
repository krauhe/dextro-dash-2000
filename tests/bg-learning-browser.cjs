/* Isoleret Chrome-test af BG-udkast og animerede mysteriekasser.
 * Testtilstand indsættes kun i browsersvaret, aldrig som produktions-API. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
    const out=path.join(__dirname,'playwright/2026-09-06_bg-valve-caches');fs.mkdirSync(out,{recursive:true});
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try{
        const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.goto('http://127.0.0.1:8766/docs/bg-learning.html');
        await page.waitForFunction(()=>window.bgLearningPreview?.getSnapshot().minutes>0);
        for(const name of ['balance','food','insulin','run']){
            await page.locator(`[data-case=${name}]`).click();await page.locator('#timeline').fill('40');
            await page.waitForFunction(()=>window.bgLearningPreview.getSnapshot().minutes===40);
            const s=await page.evaluate(()=>window.bgLearningPreview.getSnapshot());
            assert.equal(s.caseName,name);assert.ok(s.visibleParticles>0);assert.equal(s.playing,false);
            assert.ok(s.bg>0);await page.screenshot({path:path.join(out,name+'.png')});
        }
        const paused=await page.evaluate(()=>window.bgLearningPreview.getSnapshot().minutes);
        await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.bgLearningPreview.getSnapshot().minutes),paused);
        await page.locator('#pause').click();await page.waitForTimeout(150);
        assert.ok(await page.evaluate(()=>window.bgLearningPreview.getSnapshot().minutes)>paused);
        await page.locator('#replay').click();assert.ok(await page.evaluate(()=>window.bgLearningPreview.getSnapshot().minutes)<2);
        // Ventilen skal vise forsinket virkning, ikke lagerstørrelse. Samme
        // BG ved start og forskellig IOB må derfor ikke give forskellig åbning.
        async function seek(scene,time){
            await page.locator(`[data-case=${scene}]`).click();await page.locator('#timeline').fill(String(time));
            await page.waitForFunction(t=>window.bgLearningPreview.getSnapshot().minutes===t,time);
            return page.evaluate(()=>window.bgLearningPreview.getSnapshot());
        }
        const basal=await seek('balance',0),early=await seek('insulin',0);
        assert.ok(Math.abs(basal.valveOpening-early.valveOpening)<.0001);
        assert.equal(basal.iob,0);assert.ok(early.iob>.99);
        await page.screenshot({path:path.join(out,'valve-early.png')});
        const late=await seek('insulin',140);
        assert.ok(late.iob<early.iob);assert.ok(late.valveOpening>early.valveOpening+.35);
        assert.ok(late.insulinHeight<early.insulinHeight);
        assert.ok(late.foodHeight<early.foodHeight);
        assert.ok(Math.abs(late.liquidHeight-late.bg/22*3.8)<1e-9);
        await page.screenshot({path:path.join(out,'valve-late.png')});
        const phases=JSON.stringify(late.streams);await page.waitForTimeout(150);
        assert.equal(JSON.stringify((await page.evaluate(()=>window.bgLearningPreview.getSnapshot())).streams),phases,
            'pause freezes the flow animation as well as the recording');
        const emptyFood=await seek('balance',40);
        assert.equal(emptyFood.streams.food.count,0);assert.ok(emptyFood.streams.liver.count>0);
        assert.ok(emptyFood.streams.background.count>0);assert.equal(emptyFood.insulinHeight,0);
        await seek('insulin',100);
        for(const [width,height] of [[1920,1080],[1280,800],[390,844]]){
            await page.setViewportSize({width,height});await page.waitForTimeout(100);
            assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
            const layout=await page.evaluate(()=>{
                const box=document.querySelector('.preview').getBoundingClientRect();
                const tags=['cob','iob','bg','action'].map(id=>document.querySelector(`[data-label=${id}]`).getBoundingClientRect());
                return {inside:tags.every(r=>r.left>=box.left&&r.right<=box.right&&r.top>=box.top&&r.bottom<=box.bottom),
                    overlap:tags.some((a,i)=>tags.slice(i+1).some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top))};
            });
            assert.equal(layout.inside,true,`primary labels inside ${width}px preview`);
            assert.equal(layout.overlap,false,`primary labels do not overlap at ${width}px`);
            await page.screenshot({path:path.join(out,`layout-${width}.png`),fullPage:true});
        }
        await page.setViewportSize({width:1600,height:1000});
        await page.route('**/game.js?*',route=>route.fulfill({contentType:'application/javascript',
            body:fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('    window.glucoseRunner = {',`
                window.cacheArtTest=(operation)=>{
                    const block=cacheBlocks.find(b=>b.reward==='monster');
                    if(operation==='prepare'){
                        gameState='life-lost';cameraX=block.x-165;
                        player.x=block.x;player.y=131;player.vx=0;player.vy=0;player.onGround=true;
                    }
                    if(operation==='hit'){
                        gameState='playing';jump();for(let i=0;i<60&&!block.used;i++)updatePlayer(1/120);
                        gameState='life-lost';
                    }
                    if(typeof operation==='number'){updateEnemies(operation);elapsedRealSeconds+=operation;}
                    render();return {used:block.used,count:enemies.length,
                        entrance:enemies.at(-1).cacheEntrance,enemyType:enemies.at(-1).type};
                };
                window.glucoseRunner = {`)}));
        await page.goto('http://127.0.0.1:8766/index.html');await page.keyboard.press('1');
        await page.waitForFunction(()=>window.glucoseRunner?.getSnapshot().gameState==='playing');
        await page.waitForTimeout(700); // Lad titel-overlayets udtoning afslutte før visuel kontrol.
        const before=await page.evaluate(()=>window.cacheArtTest('prepare'));
        await page.screenshot({path:path.join(out,'cache-before.png')});
        const after=await page.evaluate(()=>window.cacheArtTest('hit'));assert.equal(after.used,true);assert.equal(after.count,before.count+1);
        await page.evaluate(()=>window.cacheArtTest(.22));await page.screenshot({path:path.join(out,'cache-emerging.png')});
        await page.evaluate(()=>window.cacheArtTest(.5));await page.screenshot({path:path.join(out,'cache-hop.png')});
        await page.evaluate(()=>window.cacheArtTest(.5));const landed=await page.evaluate(()=>window.cacheArtTest(.01));
        assert.equal(landed.entrance,null);assert.equal(landed.enemyType,'apple');
        await page.screenshot({path:path.join(out,'cache-landed.png')});assert.deepEqual(errors,[]);
        console.log('Browser passed: four model scenes, IOB/action separation, visible delayed valve opening, model-driven liquid/food, pause/replay/seek, non-overlapping labels in 3 viewports, mystery cache regression, no page errors.');
    }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
