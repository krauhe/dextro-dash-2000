/* Visuel kontrol af demoer og fælles insulinpartikler. Testadgang injiceres
 * kun i HTTP-svaret; produktionen får ingen ekstra kontrolfunktioner. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.join(__dirname,'playwright/2026-09-06_demo-lessons');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.route('**/game.js?*',route=>route.fulfill({contentType:'application/javascript',body:
   fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('    window.glucoseRunner = {',`
    window.demoTest={start(){startAttractDemo();render();},tick(frames){for(let i=0;i<frames;i++)update(1/60);render();},
      read(){return {kind:demoLesson?.kind,bg:getGameBG(),x:player.x,vx:player.vx,insulin:player.insulinUseTime,mode:demoMode};}};
    window.glucoseRunner = {`)}));
  await page.goto('http://127.0.0.1:8766/index.html');
  await page.waitForFunction(()=>window.demoTest&&window.glucoseRunner);
  await page.evaluate(()=>{demoTest.start();demoTest.start();});
  await page.evaluate(()=>demoTest.tick(1));
  await page.screenshot({path:path.join(out,'01-food-approach.png')});
  await page.evaluate(()=>demoTest.tick(1200));
  const food=await page.evaluate(()=>demoTest.read());assert.equal(food.kind,'food');assert(food.bg>4.6);assert(Math.abs(food.vx)<.01);
  await page.screenshot({path:path.join(out,'02-food-rest.png')});
  await page.evaluate(()=>demoTest.start());
  for(let i=0;i<180;i++){
   await page.evaluate(()=>demoTest.tick(1));
   if((await page.evaluate(()=>demoTest.read())).insulin>.0)break;
  }
  await page.evaluate(()=>demoTest.tick(12));
  await page.screenshot({path:path.join(out,'03-insulin-particles.png')});
  await page.evaluate(()=>demoTest.tick(1200));
  const insulin=await page.evaluate(()=>demoTest.read());assert(insulin.bg<10.8);assert(Math.abs(insulin.vx)<.01);
  await page.screenshot({path:path.join(out,'04-insulin-rest.png')});
  await page.setViewportSize({width:1280,height:800});await page.screenshot({path:path.join(out,'05-laptop.png')});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'report.txt'),'\ufeff'+JSON.stringify({date:'2026-09-06',food,insulin,errors,note:'Scripted real-engine demos. No full campaign or audio listening test.'},null,2));
  console.log(JSON.stringify({food,insulin,errors,out}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
