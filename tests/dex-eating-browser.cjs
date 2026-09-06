/* Visuel regression for hele indtrækningen i begge retninger. Testadgangen
 * indsættes kun i browserens svar; spillet får ingen ekstra kontrol-API. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
    const out=path.join(__dirname,'playwright/2026-09-06_dex-eating');fs.mkdirSync(out,{recursive:true});
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try{
        const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.route('**/game.js?*',route=>route.fulfill({contentType:'application/javascript',body:
            fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('    window.glucoseRunner = {',`
            window.eatingTest = {
                setup(type,facing){
                    startLevel(0);gameState='life-lost';cameraX=0;
                    Object.assign(player,{x:125,y:levels[0].groundY-PLAYER_HEIGHT,vx:0,vy:0,onGround:true,facing});
                    resetPlayerTail();
                    enemies=[createEnemy({type,x:player.x+(facing>0?16:-21),y:levels[0].groundY-14,
                        minX:70,maxX:200,speed:0,direction:-facing,portionScale:1},0)];
                    enemies[0].direction=-facing;
                    updateEnemies(0);render();
                },
                frame(progress){
                    player.eatAnimationTime=.92*.9-.66*progress;
                    const previous=enemies[0].biteAnimationTime;
                    const dt=Math.max(0,previous-.66*(1-progress));
                    updateParticles(dt);updateEnemies(dt);
                    render();return {food:getEatingFoodPose(enemies[0]),mouth:getEatingMouthPosition(),alive:enemies[0].alive,
                        pulp:particles.filter(p=>p.kind==='food-pulp').length};
                }
            };
    window.glucoseRunner = {`)}));
        await page.goto('http://127.0.0.1:8766/index.html');await page.keyboard.press('1');
        await page.waitForFunction(()=>window.glucoseRunner?.getSnapshot().player3DFrames>2);
        await page.waitForTimeout(800);
        // Gem fuld kontekst fra hver fase; tallene er simuleret animationstid.
        for(const type of ['apple','banana','avocado','pizza'])for(const facing of [1,-1]){
            await page.evaluate(([t,f])=>window.eatingTest.setup(t,f),[type,facing]);
            let size=Infinity;
            for(const progress of [0,.2,.45,.65,.85,1]){
                const result=await page.evaluate(p=>window.eatingTest.frame(p),progress);
                assert.equal(result.alive,false,'side contact starts eating');
                assert.ok(result.food.size<=size);size=result.food.size;
                if(progress===1)assert.equal(result.food.size,0);
                await page.screenshot({path:path.join(out,type+'-'+facing+'-'+progress+'.png')});
            }
        }
        await page.route('**/docs/vendor/three.min.js',route=>route.fulfill({contentType:'application/javascript',body:''}));
        await page.reload();await page.keyboard.press('1');await page.waitForTimeout(800);
        assert.equal(await page.evaluate(()=>window.glucoseRunner.getSnapshot().playerRenderer),'sprite');
        for(const facing of [1,-1]){
            await page.evaluate(f=>window.eatingTest.setup('apple',f),facing);
            for(const progress of [0,.45,.85,1]){
                await page.evaluate(p=>window.eatingTest.frame(p),progress);
                await page.screenshot({path:path.join(out,'sprite-'+facing+'-'+progress+'.png')});
            }
        }
        assert.deepEqual(errors,[]);
        console.log('Eating: real side contact, four foods, both directions, six frames, shrinking to zero and sprite fallback; no page errors.');
    }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
