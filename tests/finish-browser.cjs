/* Kontrollerer løbsmålet i alle baner og gemmer lyse/mørke visuelle prøver.
 * Den interne positionering indsættes kun i testbrowserens JavaScript-svar. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
    const out=path.join(__dirname,'playwright/2026-09-06_race-finish');fs.mkdirSync(out,{recursive:true});
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try{
        const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('**/game.js?*',route=>route.fulfill({contentType:'application/javascript',body:
            fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('    window.glucoseRunner = {',`
                window.finishTest={
                    setup(stage){
                        startLevel(stage);setTutorialEnabled(false);gameState='life-lost';
                        const level=getCurrentLevel();
                        Object.assign(player,{x:level.finishX-42,y:level.groundY-PLAYER_HEIGHT,
                            vx:0,vy:0,onGround:true,facing:1});
                        resetPlayerTail();cameraX=level.width-SCREEN_WIDTH;render();
                    },
                    crossing(){
                        const level=getCurrentLevel();gameState='playing';
                        player.x=level.finishX-.01;update(0);const before=gameState;
                        player.x=level.finishX;update(0);return {before,after:gameState};
                    },
                    wave(time){elapsedRealSeconds=time;render();}
                };
    window.glucoseRunner = {`)}));
        await page.goto('http://127.0.0.1:8766/index.html');await page.keyboard.press('1');
        await page.waitForFunction(()=>window.glucoseRunner?.getSnapshot().player3DFrames>2);
        await page.waitForTimeout(800);
        for(let stage=0;stage<10;stage++){
            await page.evaluate(s=>window.finishTest.setup(s),stage);
            if([0,3,6,7,9].includes(stage)){
                await page.screenshot({path:path.join(out,`stage-${stage+1}.png`)});
            }
            const crossing=await page.evaluate(()=>window.finishTest.crossing());
            assert.equal(crossing.before,'playing',`stage ${stage+1}: no early finish`);
            assert.equal(crossing.after,'bonus-counting',`stage ${stage+1}: original finishX`);
        }
        await page.evaluate(()=>window.finishTest.setup(0));
        for(const [width,height] of [[1280,800],[375,667]]){
            await page.setViewportSize({width,height});
            await page.screenshot({path:path.join(out,`viewport-${width}.png`)});
        }
        await page.setViewportSize({width:1920,height:1080});
        for(const time of [0,.5,1]){
            await page.evaluate(t=>window.finishTest.wave(t),time);
            await page.locator('#gameCanvas').screenshot({path:path.join(out,`wave-${time}.png`)});
        }
        assert.deepEqual(errors,[]);
        console.log('Finish: all ten original crossing thresholds pass; five themes, three viewports and banner animation rendered without page errors.');
    }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
