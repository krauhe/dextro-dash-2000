/* De to forfattede demoer køres med den rigtige motor og normale kontaktregler.
 * Testfixture genbruges uden at køre dens øvrige, uafhængige regressioner. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync(__dirname+'/gameplay.test.js','utf8').split('const {g, snapshot, calls, audioCalls, element} = createGame();')[0];
const createGame=new Function('require','__dirname',fixture+';return createGame;')(require,__dirname);
const {g,snapshot}=createGame();
g.startAttractDemo(); // Almindelig demo bevares som første indslag.
for(const kind of ['food','insulin']){
    g.startAttractDemo();const initial=snapshot().trueBG;
    for(let i=0;i<26*60;i++)g.update(1/60);
    const result=snapshot();
    assert.equal(g.state,'playing');assert.equal(g.demoMode,true);
    assert(Math.abs(g.player.vx)<.01,'DEX rests after contact');
    if(kind==='food')assert(result.trueBG>initial+.2,'food demo shows a real BG rise');
    else assert(result.trueBG<initial-.2,'insulin demo shows a real BG fall');
    console.log(kind,initial,result.trueBG);
}
g.startLevel(0);assert(Math.abs(snapshot().trueBG-6)<.01,'normal play resets fictional demo state');
console.log('PASS demo lessons: real contact, real physiology, rest and clean reset');
