/* Viser åbningsområderne i det rigtige spil og genafspiller geometriruter.
 * Kun lokal testinjektion: ingen nye debug-funktioner i produktionsspillet.
 * Fjender og fysiologi vises på billeder, men fryses under isoleret rutetest. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.join(__dirname,'playwright/2026-09-06_opening-units');fs.mkdirSync(out,{recursive:true});
 const routes=JSON.parse(fs.readFileSync(path.join(out,'routes.json'),'utf8'));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/game.js?*',r=>r.fulfill({contentType:'application/javascript',body:
   fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('    window.glucoseRunner = {',`
    window.unitTest={
     stomp(){startLevel(0);setTutorialEnabled(false);physiologyState.trueBG=6;
      const enemy=enemies.find(e=>e.x===1892),target=platforms.find(p=>p.x===1911&&p.y===37);
      Object.assign(player,{x:enemy.x+2,y:enemy.y-22,previousY:enemy.y-24,vy:20,vx:0,onGround:false});
      updateEnemies(0);let landed=false;
      for(let f=0;f<120;f++){keys.left=false;keys.right=player.x<target.x+15;updatePlayer(1/60);collectObjects();
       if(player.onGround&&Math.abs(player.y+23-target.y)<.01){landed=true;break;}}
      gameState='life-lost';cameraX=1780;render();return {landed,consumed:!enemy.alive,
       diamonds:diamonds.filter(d=>d.y===24&&d.collected).length};},
     pose(stage,kind){startLevel(stage);setTutorialEnabled(false);
      const u=getCurrentLevel().obstacleUnits.find(u=>u.kind===kind);
      player.x=u.x+2;player.y=131;cameraX=u.x-12;gameState='life-lost';render();return u;},
     replay(data){startLevel(data.stage);setTutorialEnabled(false);enemies=[];
      Object.assign(player,{x:data.entry,y:131,vx:0,vy:0,onGround:true,eatAnimationTime:0});
      physiologyState.trueBG=6;gameState='playing';
      for(const action of data.route){keys.left=action.direction<0;keys.right=action.direction>0;
       if(action.mode!=='walk')jump();
       for(let f=0;f<action.frames;f++){
        if(action.mode==='short'&&f===7)releaseJump();
        updateStageObstacles(1/60);updatePlayer(1/60);
       }
      }
      gameState='life-lost';cameraX=Math.max(0,player.x-100);render();
      return {x:player.x,y:player.y};
     }
    };window.glucoseRunner = {`)}));
  await page.goto('http://127.0.0.1:8766/index.html');await page.keyboard.press('1');
  await page.waitForFunction(()=>window.glucoseRunner?.getSnapshot().player3DFrames>2);
  for(const data of routes){
   const u=await page.evaluate(d=>unitTest.pose(d.stage,d.unit),data);
   if(!data.reverse&&!data.target)await page.locator('canvas').first().screenshot({path:path.join(out,data.unit+'.png')});
   const end=await page.evaluate(d=>unitTest.replay(d),data);
   assert(data.target?Math.abs(end.x+8-data.target.x)<15&&Math.abs(end.y+23-data.target.y)<1
    :data.reverse?end.x<=u.x+8:end.x>=u.x+u.width-30,JSON.stringify({data,end}));
   assert(end.y<145);console.log('PASS browser route',data.unit,data.target?'upper bonus':data.reverse?'return':'forward');
  }
  const crown=await page.evaluate(()=>unitTest.stomp());
  assert(crown.landed&&crown.consumed&&crown.diamonds>0);
  await page.locator('canvas').first().screenshot({path:path.join(out,'canopy-crown-stomp.png')});
  console.log('PASS browser Canopy crown stomp and diamond pickup');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
