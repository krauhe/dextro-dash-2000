/*
 * CAMPAIGN.JS — ti originale baner, temaer og nye portionsbaserede madprofiler.
 * Data deles af spil, kortværksted og generator. Geometrien har egne navngivne
 * møder: madpassager, hovedkasser, trampbonus og gulve der smuldrer.
 * Alle mål er i spillets logiske koordinater, ikke skærmpixels.
 */
'use strict';

const DEXTRO_MACRO_COLORS = { carbs: '#4ade80', protein: '#60a5fa', fat: '#f59e0b' };

// USDA SR Legacy, hentet fra det officielle API 2026-09-06. Kulhydrat i
// amerikanske data indeholder fibre; motoren får tilgængeligt kulhydrat,
// mens fibrene angives særskilt i carbParams. Portionerne er spiselig vægt.
function foodProfile(name, points, weight, carbs, protein, fat, fibre, sugars, sourceId) {
    return {
        name, stompMessage: `${name} POP!`, stompPoints: points, sourceId,
        referenceNutrition: { weight, carbs, protein, fat, eatTimeMin: 2 },
        carbParams: {
            simpleFraction: Math.min(1, sugars / Math.max(0.01, carbs)),
            fiberPerGram: fibre / Math.max(0.01, carbs), retentionFactor: 1,
        },
    };
}
const DEXTRO_NEW_FOODS = {
    apple: foodProfile('APPLE LADY', 120, 100, 11.41, 0.26, 0.17, 2.4, 10.39, 171688),
    egg: foodProfile('EGG MAN', 100, 50, 0.56, 6.29, 5.305, 0, 0.56, 173424),
    banana: foodProfile('BANANA MAN', 160, 100, 20.24, 1.09, 0.33, 2.6, 12.23, 173944),
    avocado: foodProfile('AVOCADO MAN', 140, 75, 1.3725, 1.5, 10.995, 5.025, 0.495, 171705),
    // Samme komplette burgerportion som T1D Simulatorens madkatalog.
    burger: {...foodProfile('BURGER MAN', 350, 300, 40, 40, 40, 0, 0, 'T1D foods.js:burger'),
        referenceNutrition:{weight:300,carbs:40,protein:40,fat:40,eatTimeMin:6},
        carbParams:{simpleFraction:0.1,fiberPerGram:0.02,retentionFactor:1}},
};

const DEXTRO_THEMES = {
    orchard: {name:'Orchard', background:null, music:'bright', soil:['#785443','#49352b','#242735'], top:'#66bd62', trim:'#c8efa1', detail:'#af9061'},
    cellar: {name:'Cellar', background:'assets/biome-cellar.png', music:'dark', soil:['#696274','#41364c','#231d31'], top:'#b4a0a2', trim:'#ebd0a0', detail:'#948599'},
    cave: {name:'Crystal cave', background:'assets/biome-cave.png', music:'dark', soil:['#3f4c74','#292746','#181b30'], top:'#73b8d6', trim:'#baebff', detail:'#7562a3'},
    mountain: {name:'Mountain pass', background:'assets/biome-mountain.png', music:'bright', soil:['#70838c','#414e68','#293344'], top:'#d5eff5', trim:'#ffffff', detail:'#99a6b8'},
    volcano: {name:'Volcano', background:'assets/biome-volcano.png', music:'volcano', soil:['#5f4548','#312731','#1d1c28'], top:'#d07645', trim:'#ffc06d', detail:'#88575b', lava:true},
    ice: {name:'Ice cavern', background:'assets/biome-ice.png', music:'ice', soil:['#66a7c4','#366d99','#22416c'], top:'#c1f3ff', trim:'#ffffff', detail:'#83d0e6'},
    factory: {name:'Pantry works', background:'assets/biome-cellar.png', music:'dark', soil:['#72858a','#44535e','#222c3b'], top:'#e8b964', trim:'#fff0c6', detail:'#9cacb0'},
    citadel: {name:'Sugarfall citadel', background:'assets/biome-cave.png', music:'volcano', soil:['#746085','#42324e','#211b32'], top:'#c693da', trim:'#f3cdff', detail:'#a07fad', lava:true},
};

const DEXTRO_STAGE_SPECS = [
    {name:'Orchard Start', theme:'orchard', roster:['apple'], encounters:['meet','crate','foodGate','penRoute'], time:95},
    {name:'Orchard Tumble', theme:'orchard', roster:['apple','egg'], encounters:['meet','eggDrop','crate','stomp','penRoute'], time:110},
    {name:'Fruit Market', theme:'orchard', roster:['apple','banana','avocado','egg'], encounters:['meet','foodGate','pump','stomp','penRoute','caneVault'], time:130},
    {name:'Cellar Fizz', theme:'cellar', roster:['soda','apple','banana'], encounters:['meet','crate','stomp','foodGate','penRoute','caneVault'], time:145},
    {name:'Crystal Crumble Cavern', theme:'cave', roster:['cake','apple','egg'], encounters:['meet','crumble','foodGate','pump','penRoute','stomp'], time:150},
    {name:'Alpine Burger Pass', theme:'mountain', roster:['burger','banana','avocado'], encounters:['meet','stomp','crumble','foodGate','penRoute','crate','caneVault'], time:160},
    {name:'Pizza Volcano', theme:'volcano', roster:['pizza','apple','soda'], encounters:['meet','crate','crumble','foodGate','penRoute','stomp','caneVault'], time:170},
    {name:'Icebox Run', theme:'ice', roster:['egg','banana','soda','avocado'], encounters:['meet','eggDrop','crumble','pump','stomp','penRoute','caneVault'], time:170},
    {name:'Pantry Works', theme:'factory', roster:['burger','cake','soda','pizza','apple','egg'], encounters:['meet','pump','crumble','foodGate','autoPump','penRoute','stomp','caneVault'], time:190},
    {name:'Sugarfall Citadel', theme:'citadel', roster:['pizza','soda','burger','cake','banana','egg','avocado','apple'], encounters:['meet','pump','eggDrop','foodGate','crumble','autoPump','penRoute','stomp','caneVault'], time:210},
];

function buildDextroStage(index, seed = 2000 + index) {
    const spec = DEXTRO_STAGE_SPECS[index];
    if (!spec) throw new Error('Stage must be 1–10');
    const span = 420;
    let randomState=seed>>>0;
    const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
    const level = {
        name:spec.name, theme:spec.theme, seed, stage:index+1, roster:[...spec.roster],
        width:spec.encounters.length*span+340, groundY:154,
        timeSeconds:spec.time, platforms:[], items:[], diamonds:[], enemies:[],
        blocks:[], tutorialCues:[], encounters:[],
    };
    level.finishX=level.width-100;
    let nextId=0;
    const platform=(x,y,width,height=12,extra={}) => {
        const p={id:`p${nextId++}`,x,y,width,height,...extra}; level.platforms.push(p); return p;
    };
    const monster=(type,x,floorY=154,extra={}) => {
        // Enemies' historical y uses feet minus 14; spawning normalises it.
        const e={type,x,y:floorY-14,minX:x-22,maxX:x+68,speed:18+index,
            ...extra}; level.enemies.push(e); return e;
    };
    const gemRow=(x,y,n=4) => { for(let k=0;k<n;k++) level.diamonds.push([x+k*16,y]); };
    const cue=(x,id,text) => level.tutorialCues.push({x,id,text});
    for (let n=0;n<spec.encounters.length;n++) {
        const start=120+n*span, kind=spec.encounters[n];
        const type=spec.roster[n%spec.roster.length];
        level.encounters.push({kind,x:start,type});
        // De tidlige møder har ubrudt jord. Senere huller er korte og synlige.
        if(kind==='crumble') {
            platform(n*span,154,240,40);
            platform(n*span+240,154,32,40,{crumble:true});
            platform(n*span+272,154,32,40,{crumble:true});
            platform(n*span+304,154,32,40,{crumble:true});
            platform(n*span+336,154,84,40);
            // Den øvre omvej er stabil og har færre point end smuldregulvet.
            platform(n*span+190,128,68); platform(n*span+248,108,110); platform(n*span+350,128,58);
            gemRow(n*span+249,139,5);
            cue(start-30,'crumble','Cracked floors crumble after you land. Keep moving or use the upper path.');
            if(index>=4) monster(type,n*span+362,154,{minX:n*span+340,maxX:n*span+416});
        } else if (DEXTRO_THEMES[spec.theme].lava && kind==='crate') {
            platform(n*span,154,345,40);
            platform(n*span+373,154,47,40);
        } else {
            platform(n*span,154,span,40);
        }
        if(kind==='meet') {
            monster(spec.roster[0],start+145,154,{minX:start+130,maxX:start+205});
            gemRow(start-40,139,3);
            level.items.push({type:'candy',x:start+260,y:138});
            if(spec.roster[0]==='pizza') cue(start+30,'meet-pizza','Pizza Lady aims before throwing cheese. Watch her wind-up.');
            if(spec.roster[0]==='soda') cue(start+30,'meet-soda','Shaking Fizzler: bounce on top. Side contact makes him explode.');
        } else if(kind==='foodGate') {
            // Unbroken ceiling reaches the HUD boundary: no space for a stomp.
            // The ordinary play route goes under it and includes one food contact.
            platform(start+40,30,116,98,{solid:true,foodGate:true});
            monster(index<2?'apple':type,start+83,154,{speed:0,minX:start+83,maxX:start+105});
            gemRow(start+172,137,5);
        } else if(kind==='eggDrop') {
            platform(start+65,96,95);
            monster('egg',start+85,96,{eggDrop:true,minX:start+55,maxX:start+230,speed:0});
            gemRow(start+170,137,4);
            cue(start-25,'egg-drop','Watch the wobbling egg above. Once it drops and rolls, touching it costs a life.');
        } else if(kind==='stomp') {
            // Højden kræver tramp. Seks enheders luft under opspringets top
            // giver margen ved almindelige 30–60 FPS, ikke kun ideel fysik.
            monster(type,start+108,154,{speed:0,minX:start+108,maxX:start+130});
            platform(start+108,77,64);
            gemRow(start+116,63,3);
            level.blocks.push({x:start+148,y:37,width:18,height:16,reward:index>=8?'autoPump':index>=2?'pump':'diamonds'});
            cue(start-25,'stomp-route','Bounce from a monster to reach the high stash. The ground route stays open.');
        } else if(kind==='penRoute') {
            platform(start+35,128,70); platform(start+96,108,90); platform(start+178,128,64);
            // Exact overlap: these diamonds really do involve touching a pen.
            level.items.push({type:'insulin',x:start+140,y:94});
            gemRow(start+132,94,2);
            level.blocks.push({x:start+220,y:111,width:18,height:16,reward:'diamonds'});
            if(index>=7) monster(type,start+280,154,{minX:start+255,maxX:start+335});
        } else if(kind==='caneVault') {
            // Immediate food pickup, distinct from stored A-key candy.
            platform(start+40,30,100,98,{solid:true});
            level.items.push({type:'sugarCane',x:start+95,y:139});
            gemRow(start+175,137,7);
            level.blocks.push({x:start+295,y:110,width:18,height:16,reward:'pump'});
        } else if(kind==='pump'||kind==='autoPump') {
            level.items.push({type:kind,x:start+55,y:139});
            platform(start+110,128,75); platform(start+175,105,65);
            for(let k=0;k<3;k++) level.items.push({type:'insulin',x:start+125+k*36,y:90});
            monster(type,start+265);
            if(kind==='pump') level.blocks.push({x:start-30,y:110,width:18,height:16,
                reward:'monster',monsterType:type});
        } else if(kind==='crate') {
            level.blocks.push({x:start+80,y:110,width:18,height:16,reward:'diamonds'});
            level.blocks.push({x:start+125,y:97,width:18,height:16,reward:'candy'});
            level.blocks.push({x:start+155,y:110,width:18,height:16,
                reward:'monster',monsterType:type});
            platform(start+218,130,70); monster(type,start+280,154,{minX:start+275,maxX:start+310});
        }
        // One reserve pickup per later encounter, never placed in a mandatory
        // low tunnel. No adaptive dosing amounts or controller suggestions.
        if(index>=2 && kind!=='penRoute') level.items.push({type:'insulin',x:start+320,y:110});
    }
    platform(spec.encounters.length*span,154,340,40);
    // Æggemødet har sin egen faste figur. I finalen genindsættes eventuelle
    // manglende typer på støttet jord, så den annoncerede rollebesætning
    // faktisk mødes i banen og ikke kun findes i dens specifikation.
    const missing=spec.roster.filter(type=>!level.enemies.some(enemy=>enemy.type===type));
    for(const [slot,type] of missing.entries()) {
        const x=spec.encounters.length*span+45+slot*65;
        monster(type,x,154,{minX:x,maxX:x+54});
    }
    // Frø varierer kun bonusdekoration på sikker jord. Låste risikoruter,
    // hopgeometri og præcist overlap mellem pen/diamant må ikke flyttes.
    for(let n=0;n<spec.encounters.length;n++) {
        level.diamonds.push([n*span+42+Math.floor(random()*24),137]);
    }
    return level;
}

const DEXTRO_CAMPAIGN = DEXTRO_STAGE_SPECS.map((_,index)=>buildDextroStage(index));
