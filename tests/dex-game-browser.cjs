/* Isoleret integrationstest af 3D-DEX i den rigtige 2D-bane.
 * Styrer spillet med tastaturet; testbrowseren bruger en midlertidig profil. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
    const out=path.join(__dirname,'playwright/2026-09-06_dex-game');fs.mkdirSync(out,{recursive:true});
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try{
        const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        // Kun testbrowserens svar får kontrollerede poser. Ingen test-setter
        // eller personlige BG-input tilføjes til den publicerbare spilfil.
        await page.route('**/game.js?*',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('    window.glucoseRunner = {',`    window.artTest = (settings) => {
            gameState='life-lost'; Object.assign(player,{vx:0,vy:0,onGround:true,eatAnimationTime:0,eatAnticipation:0,candyUseTime:0},settings.player||{});
            if(settings.bg!==undefined)physiologyState={...physiologyState,trueBG:settings.bg};
            pumpActive=!!settings.gear;autoPumpActive=settings.gear==='backpack';pumpInsulinStored=settings.stock||0;
            if(settings.bite){enemies[0].biteAnimationTime=.4;enemies[0].alive=false;}
            render();
        };
    window.glucoseRunner = {`)}));
        await page.goto('http://127.0.0.1:8766/index.html');
        await page.locator('#tutorialToggle').click();
        await page.keyboard.press('1');
        await page.waitForFunction(()=>window.glucoseRunner?.getSnapshot().gameState==='playing');
        await page.waitForFunction(()=>window.glucoseRunner?.getSnapshot().player3DFrames>2);
        const snapshot=()=>page.evaluate(()=>window.glucoseRunner.getSnapshot());
        assert.equal((await snapshot()).playerRenderer,'3d');
        await page.screenshot({path:path.join(out,'01-start.png')});
        await page.keyboard.down('ArrowRight');await page.waitForTimeout(650);
        await page.screenshot({path:path.join(out,'02-run.png')});
        await page.keyboard.down('ArrowUp');await page.waitForTimeout(170);
        await page.screenshot({path:path.join(out,'03-jump.png')});
        await page.keyboard.up('ArrowUp');await page.keyboard.up('ArrowRight');
        await page.keyboard.down('ArrowLeft');await page.waitForTimeout(200);
        await page.screenshot({path:path.join(out,'04-left.png')});await page.keyboard.up('ArrowLeft');
        for(const stage of ['2','3','4','5','6','7','8','9','0']){
            await page.keyboard.press(stage);await page.waitForTimeout(80);
            assert.equal((await snapshot()).playerRenderer,'3d');
            assert.equal((await snapshot()).stage,stage==='0'?10:Number(stage));
        }
        await page.screenshot({path:path.join(out,'05-stage10.png')});
        await page.keyboard.press('1');
        for(const [name,settings]of [
            ['idle',{bg:6}],['high',{bg:19}],['low',{bg:2.6}],
            ['pump',{bg:6,gear:'pump',stock:2}],['backpack',{bg:6,gear:'backpack',stock:2}],
            ['backpack-left',{bg:6,gear:'backpack',stock:0,player:{facing:-1}}],
            ['eat',{bg:6,bite:true,player:{facing:1,eatAnimationTime:.6}}]
        ]){await page.evaluate(settings=>window.artTest(settings),settings);await page.screenshot({path:path.join(out,'pose-'+name+'.png')});}
        assert.deepEqual(errors,[]);
        const fallback=await browser.newPage();await fallback.route('**/docs/vendor/three.min.js',route=>route.fulfill({contentType:'application/javascript',body:''}));
        await fallback.goto('http://127.0.0.1:8766/index.html');await fallback.keyboard.press('1');
        await fallback.waitForFunction(()=>window.glucoseRunner?.getSnapshot().gameState==='playing');
        assert.equal(await fallback.evaluate(()=>window.glucoseRunner.getSnapshot().playerRenderer),'sprite');
        console.log('3D game: both directions, jump, ten stages, BG/equipment/eating poses, and no-WebGL dependency fallback passed without page errors.');
    }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
