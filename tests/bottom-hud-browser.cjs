/* Bund-HUD: visuelle prøver og kontrol af uændret styring. Testadgangen
 * findes kun i browserens aflyttede svar, aldrig i den offentlige app. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.join(__dirname,'playwright/2026-09-06_particle-cloud');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/bg-hud-renderer.js?*',route=>route.fulfill({contentType:'application/javascript',body:
   fs.readFileSync(path.join(__dirname,'../bg-hud-renderer.js'),'utf8')
    .replace('const valveDrive=createValveDrive();','const valveDrive=createValveDrive();let probeValve;')
    .replace('gap=valve.gap;','gap=valve.gap;probeValve=valve;')
    .replace('return {draw,reset};',
    `return {draw,reset,inspect:()=>({particles:chamber.particles.map(q=>({...q})),stats:chamber.stats,
      valve:probeValve,visibleDrops:insulinParticles.slice(10).filter(p=>p.visible).length,
      foodParticles:foodParticles.filter(p=>p.visible).length,foodCloud:foodCloud.count,
      liquidOpacity:yellow.opacity,instances:cloud.count}),
     inspectStyle:()=>({glucose:yellow.color.getHex(),status:statusMaterial.color.getHex(),
      width:camera.right,height:camera.top,pipeBottom:Math.min(...scene.children.filter(m=>
       m.position.x===143&&m.geometry?.parameters?.width===52).map(m=>m.position.y))})};`)}));
  await page.route('**/game.js?*',route=>route.fulfill({contentType:'application/javascript',body:
   fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('    window.glucoseRunner = {',`
    window.hudTest={inspect(){return bgHUDRenderer.inspect();},style(){return bgHUDRenderer.inspectStyle();},meal(){
      gameState='playing';candyStock=2;useCandy();
      eatEnemy(enemies.find(e=>e.type==='apple'));gameState='life-lost';
      elapsedRealSeconds+=1;render();return hudMeals.map(m=>m.type);
    },step(iob,frames=1){
      physiologyState.displayIOB=iob;
      // Høje baggrundssignaler må ikke omgå en tom IOB-beholders ventil.
      bgHUDSignals={...bgHUDSignals,food:2,out:3,action:5};
      const before=performance.now();
      for(let i=0;i<frames;i++){elapsedRealSeconds+=.04;render();}
      return (performance.now()-before)/frames;
    },pose(bg,gear){
      startLevel(0);setTutorialEnabled(false);gameState='life-lost';
      physiologyState={...physiologyState,trueBG:bg,cob:gear?18:0,displayIOB:gear?1.2:0};
      bgHUDSignals.cob=gear?18:0;
      candyHUDUnlocked=gear;pumpHUDUnlocked=gear;pumpActive=gear;pumpInsulinStored=2;candyStock=3;
      elapsedRealSeconds=0;render();
      return {renderer:!!bgHUDRenderer,ground:getCurrentLevel().groundY,hud:HUD_TOP};
    }};
    window.glucoseRunner = {`)}));
  await page.goto('http://127.0.0.1:8766/index.html');
  await page.screenshot({path:path.join(out,'title-v4.png')});
  assert((await page.locator('#gameOverlay').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('title-splash-v4.png'));
  await page.keyboard.press('1');
  await page.waitForFunction(()=>window.glucoseRunner?.getSnapshot().player3DFrames>2);
  await page.waitForTimeout(800);
  for(const bg of [6,3.3,16]){
   const result=await page.evaluate(bg=>hudTest.pose(bg,bg!==6),bg);
   assert.equal(result.renderer,true);assert.equal(result.ground,154);assert.equal(result.hud,168);
   const style=await page.evaluate(()=>hudTest.style());
   assert.deepEqual(style,{glucose:0xffc943,status:bg<4?0xff4d71:bg>10?0xf7a839:0x26c67d,
    width:190,height:31,pipeBottom:2},'Yellow glucose, status-colored frame, taller insulin module and flush outlet');
   await page.locator('#gameCanvas').screenshot({path:path.join(out,`bg-${bg}.png`)});
  }
  await page.evaluate(()=>hudTest.pose(16,false));
  const frameMs=await page.evaluate(()=>hudTest.step(0,100));
  const closed=await page.evaluate(()=>hudTest.inspect()),pipe=closed.particles.filter(q=>q.x>117);
  assert.equal(closed.instances,720);assert.equal(closed.stats.escaped,0);
  assert.equal(closed.valve.gap,0);assert.equal(closed.visibleDrops,0);assert.equal(closed.foodParticles,0);
  assert.equal(closed.foodCloud,0);assert(closed.liquidOpacity<.25,'liquid does not hide gold particles');
  assert(closed.particles.every(q=>q.state==='tank'&&q.x+q.radius<=138.60001));
  assert(pipe.length>40,'Closed narrow upstream pipe stays populated');
  assert(pipe.some(q=>q.vx<0)&&pipe.some(q=>q.vx>0),'Particles bounce in both directions');
  assert(new Set(pipe.map(q=>q.y.toFixed(2))).size>50,'Cloud has no prescribed lanes');
  await page.locator('#gameCanvas').screenshot({path:path.join(out,'closed-cloud.png')});
  // Følg den samme dråbe frem til anslaget, åbningen og skyen på den anden side.
  await page.evaluate(()=>hudTest.step(1.25,32));
  const falling=await page.evaluate(()=>hudTest.inspect());
  assert.equal(falling.visibleDrops,1);assert.equal(falling.valve.impacts,0);
  assert.equal(falling.stats.escaped,0);
  await page.locator('#gameCanvas').screenshot({path:path.join(out,'insulin-falling.png')});
  await page.evaluate(()=>hudTest.step(1.25,16));
  const burst=await page.evaluate(()=>hudTest.inspect());
  assert.equal(burst.valve.impacts,1);assert(burst.valve.gap>1.3);
  assert(burst.stats.escaped>0,'Randomly moving particles pass the open aperture without an impact force');
  await page.locator('#gameCanvas').screenshot({path:path.join(out,'valve-cloud-burst.png')});
  await page.evaluate(()=>hudTest.step(0,60));
  const stopped=await page.evaluate(()=>hudTest.inspect());
  await page.evaluate(()=>hudTest.step(.049,75));
  const stillStopped=await page.evaluate(()=>hudTest.inspect());
  assert.equal(stillStopped.valve.impacts,stopped.valve.impacts);
  assert.equal(stillStopped.stats.escaped,stopped.stats.escaped);
  assert.equal(stillStopped.visibleDrops,0);assert.equal(stillStopped.valve.gap,0);
  await page.locator('#gameCanvas').screenshot({path:path.join(out,'zero-iob-settled.png')});
  for(const bg of [3.3,6,16]){
   await page.evaluate(bg=>hudTest.pose(bg,true),bg);
   await page.evaluate(()=>hudTest.step(1.25,48));
   const snapshot=await page.evaluate(()=>hudTest.inspect());
   assert(snapshot.stats.escaped>0,`Visible burst at BG ${bg}`);
   assert(snapshot.foodCloud>50,'Same golden particle pool is present in COB');
   await page.locator('#gameCanvas').screenshot({path:path.join(out,`burst-bg-${bg}.png`)});
  }
  const meals=await page.evaluate(()=>hudTest.meal());
  assert.deepEqual(meals,['candy','apple']);
  await page.locator('#gameCanvas').screenshot({path:path.join(out,'food-miniatures.png')});
  await page.setViewportSize({width:1280,height:800});
  await page.screenshot({path:path.join(out,'viewport-1280.png')});
  await page.setViewportSize({width:375,height:667});
  await page.screenshot({path:path.join(out,'viewport-375.png')});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pipe:pipe.length,firstCloud:burst.stats.escaped,scriptRenderMs:frameMs,errors}));
  console.log('PASS browser: dense random cloud, drop/valve/burst sequence, zero-IOB gate, 3 BG states, meals and responsive rendering.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
