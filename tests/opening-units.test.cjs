/* Kontrollerer de seks åbningsområders data og bevægelse med spillets egne
 * kollisionsfunktioner. Geometritest er ikke en fuld fysiologisk gennemspilning. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const scope={};vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(root,'campaign.js'),'utf8')+'\nthis.levels=DEXTRO_CAMPAIGN;',scope);
// Genbrug DOM-stub og den rigtige game.js i regressionstestene uden at køre
// deres øvrige scenarier endnu en gang eller eksportere debug-API i spillet.
const harness=fs.readFileSync(path.join(__dirname,'gameplay.test.js'),'utf8').split('const {g, snapshot, calls, audioCalls, element} = createGame();')[0];
const testScope={require,console,__dirname};vm.createContext(testScope);
vm.runInContext(harness+'\nthis.make=createGame;',testScope);
const {g}=testScope.make();
// En nåelig bonusplatform beviser ikke, at man kan gå under dens kasse.
// Test den konkrete passage og slaget separat med faktisk kollisionskode.
for(const fps of [30,60,120]){
 g.startLevel(0);g.physiology={trueBG:6};
 const floor=g.platforms.find(p=>p.x===566&&p.y===104);
 const block=g.blocks.find(b=>b.x===586);
 assert(floor.y-block.y-block.height>=31,'DEX plus visible headroom');
 for(const direction of [1,-1]){
  Object.assign(g.player,{x:direction===1?floor.x+1:block.x+block.width+2,
   y:floor.y-23,vx:0,vy:0,onGround:true,eatAnimationTime:0});
  g.keys.right=direction===1;g.keys.left=direction===-1;
  const target=direction===1?block.x+block.width+1:floor.x+2;
  for(let f=0;f<fps;f++){
   g.updatePlayer(1/fps);
   if(direction===1?g.player.x>=target:g.player.x<=target)break;
  }
  assert(direction===1?g.player.x>=target:g.player.x<=target,'walk below raised cache in both directions');
  assert.equal(g.player.y,floor.y-23);
 }
 Object.assign(g.player,{x:block.x+1,y:floor.y-23,vx:0,vy:0,onGround:true});
 g.keys.right=false;g.keys.left=false;g.jump();
 for(let f=0;f<fps&&!block.used;f++)g.updatePlayer(1/fps);
 assert(block.used,'raised cache is still hittable');assert.equal(g.player.vy,0);
}
console.log('PASS Root Slalom cache: 33-unit clearance, walking both ways and head hit at 30/60/120 FPS');
for(const fps of [30,60,120]){
 g.startLevel(0);g.setTutorialEnabled(false);g.physiology={trueBG:6};
 const enemy=g.enemies.find(e=>e.x===1892),target=g.platforms.find(p=>p.x===1911&&p.y===37);
 assert(91-target.y>218*218/(2*520),'crown is above ordinary jump reach');
 Object.assign(g.player,{x:enemy.x+2,y:enemy.y-22,previousY:enemy.y-24,vy:20,vx:0,onGround:false});
 g.updateEnemies(0);assert.equal(enemy.alive,false);assert(g.player.vy<0);
 let landed=false;
 for(let f=0;f<fps*2;f++){
  g.keys.left=false;g.keys.right=g.player.x<target.x+15;
  g.updatePlayer(1/fps);g.collectObjects();
  if(g.player.onGround&&Math.abs(g.player.y+23-target.y)<.01){landed=true;break;}
 }
 assert(landed,`Canopy crown via a real apple stomp at ${fps} FPS`);
 assert(g.diamonds.some(d=>d.y===24&&d.collected),'crown diamonds can actually be collected');
}
console.log('PASS Canopy crown: real stomp and diamond pickup at 30/60/120 FPS');
const kinds=new Set();
for(let stage=0;stage<3;stage++){
 const level=scope.levels[stage];assert.equal(level.obstacleUnits.length,stage===0?4:2);
 for(const unit of level.obstacleUnits){
  assert(unit.width>=300&&unit.width<=400);assert(!kinds.has(unit.kind));kinds.add(unit.kind);
  assert(unit.x>250&&unit.x+unit.width<level.finishX);
  const local=level.platforms.filter(p=>p.x>=unit.x&&p.x<unit.x+unit.width);
  assert(local.length>=4);assert(new Set(local.map(p=>p.y)).size>=3);
  assert(local.some(p=>p.solid));
 }
 for(const e of level.enemies){
  assert(level.roster.includes(e.type));
  for(let dx=0;dx<=22;dx++)assert(level.platforms.some(p=>p.y===e.y+14&&p.x<=e.x+dx&&p.x+p.width>=e.x+dx),'enemy has supporting floor, including adjoining ground sections');
 }
 for(const unit of level.obstacleUnits){
  const overlaps=level.items.filter(i=>i.x>=unit.x&&i.x<=unit.x+unit.width&&['insulin','sugarCane'].includes(i.type))
   .filter(i=>level.diamonds.some(d=>Math.abs(d[0]-i.x)<=8&&d[1]===i.y));
  if(unit.kind!=='rootSlalom')assert(overlaps.length>0,unit.kind+' has actual item/diamond overlap');
 }
}
// Lokal søgning med reelle hop, acceleration, vægge og lofter. Hvert fundet
// landingspunkt kan gå videre med venstre/højre, hop eller kort hop. Vi fryser
// kun BG og fjender for at skelne en geometrisk blindgyde fra spilsværhedsgrad.
function traverse(stage,unit,fps,bg,reverse=false,collapsed=false,target=null){
 g.startLevel(stage);g.setTutorialEnabled(false);g.physiology={trueBG:bg};g.enemies.splice(0);
 if(collapsed)for(const p of g.platforms)if(p.crumble)p.collapsed=true;
 const entry=reverse?unit.x+unit.width-22:unit.x+2,exit=reverse?unit.x+8:unit.x+unit.width-30;
 const queue=[{x:entry,y:131,vx:0,route:[]}],seen=new Set(),reach=new Set();let visited=0;
 for(let n=0;n<queue.length&&n<5000;n++){
  const state=queue[n];visited++;
  if(target?Math.abs(state.x+8-target.x)<15&&Math.abs(state.y+23-target.y)<1
   :reverse?state.x<=exit:state.x>=exit)return {pass:true,visited,reach:[...reach],route:state.route};
  for(const direction of [-1,1])for(const mode of ['walk','short','jump']){
   Object.assign(g.player,state,{vy:0,onGround:true,eatAnimationTime:0,previousY:state.y});
   g.keys.left=direction<0;g.keys.right=direction>0;
   if(mode!=='walk')g.jump();
   let airborne=mode!=='walk';
   for(let frame=0;frame<fps*1.3;frame++){
    if(mode==='short'&&frame===Math.round(fps*.12))g.handleKeyUp({key:'ArrowUp',preventDefault(){}});
    g.updatePlayer(1/fps);
    if(!g.player.onGround)airborne=true;
    if(g.player.y>145||g.player.x<unit.x-15||g.player.x>unit.x+unit.width+5)break;
    if(g.player.onGround&&(airborne||frame%Math.max(1,Math.round(fps*.15))===0)){
     const s={x:g.player.x,y:g.player.y,vx:g.player.vx,
      route:[...state.route,{direction,mode,frames:frame+1}]};
     reach.add(Math.round(s.y+23));
     const key=[Math.round(s.x/4),Math.round(s.y),Math.sign(s.vx)].join(':');
     if(!seen.has(key)){seen.add(key);queue.push(s);}
     if(airborne)break;
    }
   }
  }
 }
 return {pass:false,visited,maxX:Math.max(...queue.map(p=>p.x)),reach:[...reach]};
}
const routes=[];
for(let stage=0;stage<3;stage++)for(const unit of scope.levels[stage].obstacleUnits){
 for(const fps of [30,60])for(const reverse of [false,true]){
  const result=traverse(stage,unit,fps,6,reverse);assert(result.pass,JSON.stringify({stage:stage+1,kind:unit.kind,fps,reverse,...result}));
  if(fps===60)routes.push({stage,unit:unit.kind,reverse,entry:reverse?unit.x+unit.width-22:unit.x+2,route:result.route});
 }
 const weak=traverse(stage,unit,60,14.5);
 assert(weak.pass,unit.kind+' retains a lower route at BG 14.5');
 if(stage===0)assert(traverse(stage,unit,60,14.5,true).pass,unit.kind+' weak return route');
 console.log(JSON.stringify({stage:stage+1,unit:unit.name,normal:'both directions at 30/60 FPS',weakBG14_5:weak.pass}));
 if(unit.kind==='crumbleCanopy')for(const reverse of [false,true])assert(traverse(stage,unit,60,6,reverse,true).pass,'collapsed canopy retains a lower route both ways');
 const high=scope.levels[stage].platforms.filter(p=>p.x>=unit.x&&p.x<unit.x+unit.width
  && !(unit.bonus?.requiresStomp&&p.y===unit.bonus.y)).sort((a,b)=>a.y-b.y)[0];
 const target={x:high.x+high.width/2,y:high.y},bonus=traverse(stage,unit,60,6,false,false,target);
 assert(bonus.pass,unit.kind+' upper reward landing is reachable without needing an uneaten enemy');
 routes.push({stage,unit:unit.kind,reverse:false,entry:unit.x+2,route:bonus.route,target});
}
if(process.argv.includes('--routes')){
 const out=path.join(__dirname,'playwright/2026-09-06_opening-units');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'routes.json'),JSON.stringify(routes,null,2));
}
assert.equal(scope.levels[0].width,3000);assert.equal(scope.levels[0].finishX,2900);
assert.equal(scope.levels[0].timeSeconds,145);assert.equal(scope.levels[1].width,2440);
assert.equal(scope.levels[2].width,2860);
g.startLevel(0);g.setTutorialEnabled(false);g.physiology={trueBG:6};
Object.assign(g.player,{x:2899,y:131,vx:0,vy:0,onGround:true});g.keys.left=g.keys.right=false;
g.update(0);assert.equal(g.state,'playing','old finish does not end the extended stage');
g.player.x=2901;g.update(0);assert.equal(g.state,'bonus-counting','new finish triggers the existing tally');
console.log('PASS eight distinct units, extended stage 1, supported roster, reward overlap and real-collision route search');
