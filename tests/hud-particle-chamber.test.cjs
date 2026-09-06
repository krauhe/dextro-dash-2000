/* Geometrisk kontrol af tilfældig bevægelse, vægkontakt og dryp-udløste skyer.
 * Testen vurderer en spilillustration, ikke stofbalance eller fysiologi. */
const assert=require('node:assert/strict');
require('../hud-particle-chamber.js');require('../bg-hud-renderer.js');
function experiment(iob,height=8,seconds=8){
 const chamber=DexHUDChamber.create(),drive=DexBGHUD.createValveDrive();let s,firstImpact=0,firstEscape=0,maxCloud=0;
 for(let frame=0;frame<seconds*60;frame++){
  s=drive.update(iob,1/60);chamber.update({height,...s},1/60);
  if(!firstImpact&&s.impacts)firstImpact=frame+1;
  if(!firstEscape&&chamber.stats.escaped)firstEscape=frame+1;
  maxCloud=Math.max(maxCloud,chamber.particles.filter(p=>p.state==='out').length);
  for(const p of chamber.particles){assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
   if(p.state==='tank'&&s.gap===0)assert(p.x+p.radius<=138.6001,'closed metal blocks every mote');
  }
 }
 return {chamber,drive,s,firstImpact,firstEscape,maxCloud};
}
const empty=experiment(0);
assert.equal(empty.chamber.stats.count,720);assert.equal(empty.chamber.stats.escaped,0);
assert(empty.chamber.stats.collisions>1000,'real particle contacts');
const pipe=empty.chamber.particles.filter(p=>p.x>117);
// Det smallere rør har under halvdelen af det tidligere tværsnit.
assert(pipe.length>40,'narrow pipe is populated even with a closed valve');
for(const p of pipe)assert(p.y+p.radius<=4.9001,'particles stay inside the narrow pipe');
assert(pipe.some(p=>p.vx>1)&&pipe.some(p=>p.vx<-1),'both directions, not a conveyor belt');
assert(new Set(pipe.map(p=>p.y.toFixed(2))).size>25,'no fixed five lanes');
const flowing=experiment(1.25);
assert(flowing.firstEscape>flowing.firstImpact,'escape follows actual drop impact');
assert(flowing.maxCloud>=5,'multiple particles pass freely; there is no prescribed dispatch count');
const zeroAgain=flowing.chamber.stats.escaped;
for(let i=0;i<60;i++)flowing.chamber.update({height:8,...flowing.drive.update(0,1/60)},1/60);
const settled=flowing.chamber.stats.escaped;
for(let i=0;i<120;i++)flowing.chamber.update({height:8,...flowing.drive.update(0,1/60)},1/60);
assert.equal(flowing.chamber.stats.escaped,settled,'no new release once the last pulse closes');
for(const height of [.75,3.3,17]){const r=experiment(1.25,height,4);assert(r.maxCloud>0,'visible bursts at low/normal/high BG');}
const before=JSON.stringify(empty.chamber.particles);empty.chamber.update({height:8,gap:0,impacts:0},0);
assert.equal(JSON.stringify(empty.chamber.particles),before,'pause');
empty.chamber.reset();assert.equal(empty.chamber.stats.count,0);
// Samme åbning og tilfældige seed giver samme bevægelse, uanset antallet
// af insulindryp. Regression mod den gamle højrerettede anslagskraft.
const a=DexHUDChamber.create(),b=DexHUDChamber.create();
for(let i=0;i<90;i++){
 a.update({height:8,gap:i>60?2.9:0,impacts:0},1/60);
 b.update({height:8,gap:i>60?2.9:0,impacts:99},1/60);
}
assert.deepEqual(a.particles,b.particles,'insulin impact cannot push particles');
const food=DexHUDChamber.createFood();
for(const cob of [0,.049,.499,.5,1,18,40,100,0]){
 for(let i=0;i<120;i++)food.update(cob,1/60);
 const height=Math.min(14,Math.max(.04,cob/40*14));
 assert.equal(food.particles.length,cob>=.5?Math.ceil(Math.min(1,cob/40)*150):0);
 for(const p of food.particles){
  assert(p.x-p.radius>=7-1e-6&&p.x+p.radius<=29+1e-6);
  assert(p.y-p.radius>=2.8-1e-6&&p.y+p.radius<=2.8+height+1e-6);
 }
}
food.update(18,0);assert(food.particles.length>50,'visible food pool');
const foodBefore=JSON.stringify(food.particles);food.update(18,0);
assert.equal(JSON.stringify(food.particles),foodBefore,'food pause');
food.reset();assert.equal(food.particles.length,0);
console.log(JSON.stringify({count:720,closedPipe:pipe.length,cloud:flowing.maxCloud,firstImpact:flowing.firstImpact,firstEscape:flowing.firstEscape,afterStop:zeroAgain}));
console.log('PASS chamber: random motion, dense pipe, wall/pair contacts, no impact force and shared COB particles');
