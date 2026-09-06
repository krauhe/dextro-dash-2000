/* Browserkontrol af æggets indfoldning, rullecentrum og faktiske platformfald.
 * Teststyringen findes kun i det midlertidigt opsnappede JavaScript-svar. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
    const out=path.join(__dirname,'playwright/2026-09-06_egg-roll');fs.mkdirSync(out,{recursive:true});
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try{
        const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('**/game.js?*',route=>route.fulfill({contentType:'application/javascript',body:
            fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('    window.glucoseRunner = {',`
                let testEgg,testEggTime;
                window.eggTest={
                    setup(direction){
                        startLevel(1);gameState='life-lost';testEgg=enemies.find(e=>e.eggDrop);testEggTime=0;
                        player.x=testEgg.x+direction*100;resetPlayerTail();updateEggState(testEgg,1/120);
                    },
                    frame(time){
                        while(testEggTime<time){const dt=Math.min(1/120,time-testEggTime);
                            updateEggState(testEgg,dt);testEggTime+=dt;}
                        elapsedRealSeconds=time;cameraX=Math.max(0,testEgg.x-180);render();
                        return {state:testEgg.eggState,x:testEgg.x,y:testEgg.y,feet:testEgg.y+22,
                            angle:testEgg.eggRotation,tuck:testEgg.eggTuck,pose:getEggRenderPose(testEgg)};
                    }
                };
    window.glucoseRunner = {`)}));
        await page.goto('http://127.0.0.1:8766/index.html');await page.keyboard.press('2');
        await page.waitForFunction(()=>window.glucoseRunner?.getSnapshot().player3DFrames>2);
        await page.waitForTimeout(800);
        for(const direction of [-1,1]){
            await page.evaluate(d=>window.eggTest.setup(d),direction);
            let sawFall=false,sawRoll=false;
            for(const time of [0,1.2,1.3,1.5,1.8,2.1,2.5,3.0,3.5,5.8]){
                const state=await page.evaluate(t=>window.eggTest.frame(t),time);
                if(time<=1.5)assert.equal(state.feet,96,'perch supports the egg');
                assert.ok(state.feet<=154,'does not go through ground');
                sawFall ||= state.state==='falling';sawRoll ||= state.state==='rolling';
                if(time===5.8){assert.equal(state.state,'resting');assert.equal(state.tuck,0);assert.equal(state.feet,154);}
                await page.screenshot({path:path.join(out,direction+'-'+time+'.png')});
            }
            assert.ok(sawFall&&sawRoll);
        }
        assert.deepEqual(errors,[]);
        console.log('Egg browser: feet tuck, supported perch, both rolling directions, real edge falls, ground landings, feet return; no page errors.');
    }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
