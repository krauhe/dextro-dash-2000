/* Kontrollerer fire mellemlag og bananens separate lemmer i rigtig Chrome. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const out=path.join(__dirname,'playwright/2026-09-06_scenery-banana');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/game.js?*',r=>r.fulfill({contentType:'application/javascript',body:
   fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('    window.glucoseRunner = {',`
    window.artTest={setup(stage,camera=0){startLevel(stage);setTutorialEnabled(false);
      gameState='life-lost';cameraX=camera;render();},
    ready(){return stageMiddleImages.every(i=>i.complete&&i.naturalWidth>0);},
    capsules(){
      startLevel(2);setTutorialEnabled(false);gameState='life-lost';render();
      context.save();context.setTransform(1,0,0,1,0,0);
      context.fillStyle='#101428';context.fillRect(200,120,1250,280);
      for(let i=0;i<6;i++){
        elapsedRealSeconds=i*.7;
        drawPickup('insulin',300+i*200,240,140,true);
        drawPickup('insulin',300+i*200,350,36,false);
      }
      context.restore();return canvas.toDataURL();
    },
    banana(direction,time){startLevel(2);setTutorialEnabled(false);gameState='life-lost';
      const e=enemies.find(e=>e.type==='banana');
      Object.assign(e,{x:220,y:132,speed:20,direction,peelTimer:0});
      player.x=150;player.y=132;cameraX=80;elapsedRealSeconds=time;
      updateBananaDrop(e,.01);updateBananaDrop(e,.86);updateBananaPeels(.9);render();
      // Stor visuell poseprøve uden at ændre spillets sprites eller hitboxes.
      context.save();context.setTransform(1,0,0,1,0,0);context.translate(500,500);
      context.scale(direction,1);drawWalkingEnemySprite(characterImages.banana,300,'banana',time*10,true);context.restore();
      return bananaPeels.length;},
    throwGallery(){
      gameState='life-lost';context.save();context.setTransform(1,0,0,1,0,0);
      context.fillStyle='#18223b';context.fillRect(0,0,1920,1080);
      for(const [row,direction] of [[0,1],[1,-1]])for(const [i,age] of [0,.25,.5,.72,.849,1.1].entries()){
        context.save();context.translate(180+i*300,460+row*500);context.scale(direction,1);
        drawWalkingEnemySprite(characterImages.banana,390,'banana',0,false,age);context.restore();
      }
      context.restore();return canvas.toDataURL();}
    };window.glucoseRunner = {`)}));
  await page.goto('http://127.0.0.1:8766/index.html');await page.keyboard.press('1');
  await page.waitForFunction(()=>window.artTest?.ready());
  await page.waitForTimeout(800);
  const capsuleImage=await page.evaluate(()=>artTest.capsules());
  fs.writeFileSync(path.join(out,'capsule-rotation.png'),Buffer.from(capsuleImage.split(',')[1],'base64'));
  for(let stage=1;stage<=4;stage++)for(const x of [0,900]){
   await page.evaluate(([s,x])=>artTest.setup(s,x),[stage,x]);
   await page.locator('#gameCanvas').screenshot({path:path.join(out,`stage-${stage+1}-${x}.png`)});
  }
  for(const d of [-1,1])for(const t of [0,.15,.3]){
   assert.equal(await page.evaluate(([d,t])=>artTest.banana(d,t),[d,t]),1);
   await page.locator('#gameCanvas').screenshot({path:path.join(out,`banana-${d}-${t}.png`)});
  }
  const gallery=await page.evaluate(()=>artTest.throwGallery());
  fs.writeFileSync(path.join(out,'banana-throw-gallery.png'),Buffer.from(gallery.split(',')[1],'base64'));
  assert.deepEqual(errors,[]);console.log('PASS four layers, two scroll positions, six banana poses and peel rendering; no browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
