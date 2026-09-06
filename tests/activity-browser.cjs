/* Lokal browserkontrol af løb, motorpuls og stående restitution.
 * Testadgange indsættes kun i browserens svar, ikke i spillets offentlige API. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.join(__dirname,'playwright/2026-09-06_activity');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/dex-game-renderer.js?*',r=>r.fulfill({contentType:'application/javascript',body:
   fs.readFileSync(path.join(__dirname,'../dex-game-renderer.js'),'utf8').replace('return {draw,drawFood,advance,reset,','return {draw,drawFood,advance,reset,get breathing(){return {...activity};},')}));
  await page.route('**/game.js?*',r=>r.fulfill({contentType:'application/javascript',body:
   fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('    window.glucoseRunner = {',`
    window.activityTest={
      setup(stage=0){startLevel(stage);setTutorialEnabled(false);enemies=[];items=[];diamonds=[];cacheBlocks=[];
        platforms=[{x:0,y:154,width:10000,height:20}];gameState='life-lost';render();},
      step(seconds,moving){gameState='playing';keys.right=moving;keys.left=false;
        for(let i=0;i<Math.round(seconds*60);i++)update(1/60);
        gameState='life-lost';render();return {hr:physiologyEngine.smoothHeartRate,bg:getGameBG(),
          breathing:dexRenderer.breathing,dust:muscleDust.count,active:physiologyEngine.activeAktivitet?.intensitet??null};},
      pose(){render();return dexRenderer.breathing;}
    };window.glucoseRunner = {`)}));
  await page.goto('http://127.0.0.1:8766/index.html');await page.keyboard.press('1');
  await page.waitForFunction(()=>window.glucoseRunner?.getSnapshot().player3DFrames>2);
  for(const stage of [0,1]){
   await page.evaluate(stage=>activityTest.setup(stage),stage);
   await page.screenshot({path:path.join(out,`raised-trees-${stage+1}.png`)});
  }
  await page.evaluate(()=>activityTest.setup());
  const rest=await page.evaluate(()=>activityTest.step(.1,false));
  assert.equal(rest.dust,0);
  const run=await page.evaluate(()=>activityTest.step(6,true));assert(run.hr>125);assert(run.breathing.effort>.65);
  assert(run.dust>8,'model uptake produces visible dust');
  await page.screenshot({path:path.join(out,'running.png')});
  const stop=await page.evaluate(()=>activityTest.step(.25,false));
  assert.equal(stop.active,null);assert(stop.breathing.effort>.5,'standing pant follows actual pulse');
  await page.screenshot({path:path.join(out,'standing-pant.png')});
  const recovery=await page.evaluate(()=>activityTest.step(3,false));
  assert(recovery.breathing.effort<stop.breathing.effort/3);
  assert(recovery.dust<run.dust,'dust fades with contraction uptake after stopping');
  assert.equal(recovery.active,null);await page.screenshot({path:path.join(out,'recovering.png')});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({rest,run,stop,recovery}));
  console.log('PASS browser activity and standing pulse-driven breathing; no page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
