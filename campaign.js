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
    {name:'Orchard Start', theme:'orchard', roster:['apple'], encounters:['meet','crate','foodGate','penRoute'], time:145},
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
    // Kun bane 1 forlænges. De allerede afprøvede åbningsområder flyttes ikke;
    // den nye sektion indsættes før den eksisterende, korte målopløbsstrækning.
    const extensionWidth=index===0?980:0;
    let randomState=seed>>>0;
    const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
    const level = {
        name:spec.name, theme:spec.theme, seed, stage:index+1, roster:[...spec.roster],
        width:spec.encounters.length*span+340+extensionWidth, groundY:154,
        timeSeconds:spec.time, platforms:[], items:[], diamonds:[], enemies:[],
        blocks:[], tutorialCues:[], encounters:[], obstacleUnits:[],
    };
    level.finishX=level.width-100;
    let nextId=0;
    const platform=(x,y,width,height=12,extra={}) => {
        const p={id:`p${nextId++}`,x,y,width,height,...extra}; level.platforms.push(p); return p;
    };
    const monster=(type,x,floorY=154,extra={}) => {
        // Enemies' historical y uses feet minus 14; spawning normalises it.
        const e={type,x,y:floorY-14,minX:x-22,maxX:x+68,speed:18+index,
            ...extra};
        // Bananen går også en kort tur i madpassagerne; de oprindelige
        // patruljegrænser holder den under loftet eller bonusplatformen.
        if(type==='banana' && e.speed===0) {
            e.speed=14;e.minX=x-12;e.maxX=x+34;
        }
        level.enemies.push(e); return e;
    };
    const gemRow=(x,y,n=4) => { for(let k=0;k<n;k++) level.diamonds.push([x+k*16,y]); };
    // Seks håndbyggede områder erstatter gamle skabeloner i de tre åbningsbaner.
    // Hvert område har egne lokale koordinater; resten af kampagnen bevares.
    // Jordhøjder varierer, men alle obligatoriske spring er under normalhoppenes
    // idealgrænse (45,7 i højden / 73,8 i længden). Høj bonus er frivillig.
    const openingUnits = [
        {crate:'rootSlalom',penRoute:'orchardFork'},
        {eggDrop:'rollingOrchard',penRoute:'crumbleCanopy'},
        {pump:'marketRoofs',penRoute:'marketCrossroads'},
    ];
    function obstacleUnit(kind, base) {
        const width = ['rootSlalom','rollingOrchard','marketRoofs'].includes(kind)?360:380;
        const x=base+20;
        const floor=(dx,y,w,extra={})=>platform(x+dx,y,w,194-y,{solid:true,...extra});
        const ledge=(dx,y,w,extra={})=>platform(x+dx,y,w,8,extra);
        const gems=(dx,y,n)=>gemRow(x+dx,y,n);
        const item=(type,dx,y)=>level.items.push({type,x:x+dx,y});
        const cache=(dx,y,reward)=>level.blocks.push({x:x+dx,y,width:18,height:16,reward,monsterType:'apple'});
        const enemy=(type,dx,y,lo,hi,extra={})=>monster(type,x+dx,y,
            {minX:x+lo,maxX:x+hi,...extra});
        const contracts={
            rootSlalom:['Root Slalom','Uneven solid roots and a low apple pocket','Climb the open ledges to bypass the apple','Candy, mystery caches and an apple-overlap diamond'],
            orchardFork:['Orchard Fork','Two low ridges and an elevated split route','Walk the lower route with fewer diamonds','Upper diamonds overlap an insulin capsule'],
            rollingOrchard:['Rolling Orchard','A falling egg crosses the lower lane','Jump onto refuge ledges or take the upper bridge','Upper capsule diamond and lower apple diamond'],
            crumbleCanopy:['Crumble Canopy','Temporary high steps above stable soil','Stay on the low terraces; a fall returns to solid ground','A high insulin-diamond pocket'],
            marketRoofs:['Market Roofs','Climb staggered stalls to visible equipment','Use the permanent steps and skip the highest equipment perch','Manual pump, upper diamonds and a mystery cache'],
            marketCrossroads:['Market Crossroads','A short trench followed by two reward lanes','Use the open climb around the low sugar passage','Upper insulin diamonds or lower sugar-cane diamonds'],
        };
        const [name,challenge,alternative,reward]=contracts[kind];
        level.obstacleUnits.push({kind,name,x,width,entry:{x,y:154},exit:{x:x+width,y:154},
            challenge,alternative,reward,recovery:'Stable ground and permanent return ledges',
            features:['solid','platform','pickup',...(kind==='crumbleCanopy'?['crumble']:[])]});
        level.encounters.push({kind,x,type:kind==='rollingOrchard'?'egg':'apple',width});
        // Kort, flad ind- og udgang forbinder området med naboen. Undgå et skjult
        // ubrudt jordstykke under det bevidste hul i Market Crossroads.
        if(kind==='marketCrossroads') {
            platform(base,154,132,40);platform(base+164,154,256,40);
        } else platform(base,154,420,40);
        if(kind==='rootSlalom') {
            floor(42,142,30);floor(104,132,44);floor(194,140,32);floor(279,144,28);
            ledge(126,104,48);ledge(191,86,66);ledge(266,116,50);
            enemy('apple',242,154,234,279,{speed:0});gems(250,138,1);
            // 33 enheders frihøjde over y=104: DEX er 23 høj og skal kunne
            // gå under kassen, ikke kun nå platformen fra en anden rute.
            gems(200,72,3);cache(327,110,'monster');cache(146,55,'diamonds');
            item('candy',300,102);
        } else if(kind==='orchardFork') {
            floor(48,138,42);floor(278,140,42);
            ledge(92,112,55);ledge(148,88,74);ledge(234,112,54);
            item('insulin',182,74);gems(174,74,3);gems(106,98,2);
            // Den nedre række har mindre udbytte og ingen insulin-kontakt.
            // Frihøjde også over højderyggen ved retur: den gamle lave kasse
            // efterlod en 13-enheders lomme, hvor en svækket DEX ikke kunne hoppe.
            gems(184,139,2);cache(333,93,'diamonds');
        } else if(kind==='rollingOrchard') {
            floor(48,140,32);ledge(95,96,66);ledge(190,119,46);ledge(271,108,55);
            enemy('egg',116,96,96,335,{eggDrop:true,speed:0});
            enemy('apple',244,154,240,267,{speed:0});gems(252,139,1);
            gems(197,105,2);gems(284,94,2);item('insulin',292,94);
            item('candy',338,138);
        } else if(kind==='crumbleCanopy') {
            floor(42,140,38);floor(187,140,44);floor(290,138,36);
            ledge(84,116,43);ledge(137,94,40,{crumble:true});
            ledge(194,74,52,{crumble:true});ledge(258,106,42);
            item('insulin',216,60);gems(208,60,3);gems(90,102,2);
            enemy('apple',251,154,240,286,{speed:0});gems(259,139,1);
            // Den høje præmie kræver ikke, at æg eller æbler stadig eksisterer.
            cache(347,110,'diamonds');
        } else if(kind==='marketRoofs') {
            floor(45,138,36);floor(95,116,48);floor(159,90,60);
            ledge(220,64,55);floor(280,119,38);ledge(325,139,30);
            item('pump',245,50);gems(232,50,3);cache(184,51,'diamonds');cache(330,110,'monster');
            // Bananen patruljerer kun sin brede, understøttede markedsbod.
            enemy('banana',167,90,160,218,{speed:15});
            item('insulin',302,105);gems(294,105,2);
        } else if(kind==='marketCrossroads') {
            floor(51,139,38);floor(163,137,40);
            ledge(97,115,44);ledge(153,91,49);ledge(215,70,52);
            ledge(291,99,49);ledge(342,129,32);
            item('insulin',240,56);gems(232,56,3);
            // Under bonusbroen er en kort lav passage: sukkerstokken påvirker
            // BG straks, modsat bolcher, der blot lægges i A-lageret.
            platform(x+214,109,66,19,{solid:true});
            item('sugarCane',247,139);gems(239,139,3);
            gems(304,85,2);cache(344,91,'candy');
        }
    }
    for (let n=0;n<spec.encounters.length;n++) {
        const start=120+n*span, kind=spec.encounters[n];
        const custom=openingUnits[index]?.[kind];
        if(custom) { obstacleUnit(custom,n*span); continue; }
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
        } else if(kind==='foodGate') {
            // Skift mellem bred tunnel og en slank lodret mur. Begge bevarer
            // 26 enheders frihøjde, men den smalle variant forkorter strækningen
            // under loftet og viser mere af baggrunden omkring madkontakten.
            const narrowGate=index%2===0;
            platform(start+(narrowGate?77:40),30,narrowGate?34:116,98,{solid:true,foodGate:true});
            monster(index<2?'apple':type,start+83,154,{speed:0,minX:start+83,maxX:start+105});
            gemRow(start+172,137,5);
        } else if(kind==='eggDrop') {
            platform(start+65,96,95);
            monster('egg',start+85,96,{eggDrop:true,minX:start+55,maxX:start+230,speed:0});
            gemRow(start+170,137,4);
        } else if(kind==='stomp') {
            // Højden kræver tramp. Seks enheders luft under opspringets top
            // giver margen ved almindelige 30–60 FPS, ikke kun ideel fysik.
            monster(type,start+108,154,{speed:0,minX:start+108,maxX:start+130});
            platform(start+108,77,64);
            gemRow(start+116,63,3);
            level.blocks.push({x:start+148,y:37,width:18,height:16,reward:index>=8?'autoPump':index>=2?'pump':'diamonds'});
        } else if(kind==='penRoute') {
            platform(start+35,128,70); platform(start+96,108,90); platform(start+178,128,64);
            // Exact overlap: these diamonds really do involve touching a pen.
            level.items.push({type:'insulin',x:start+140,y:94});
            gemRow(start+132,94,2);
            level.blocks.push({x:start+220,y:111,width:18,height:16,reward:'diamonds'});
            if(index>=7) monster(type,start+280,154,{minX:start+255,maxX:start+335});
        } else if(kind==='caneVault') {
            // Immediate food pickup, distinct from stored A-key candy.
            const narrowVault=index%2===1;
            platform(start+(narrowVault?79:40),30,narrowVault?32:100,98,{solid:true});
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
    if(index===0){
        // To forskellige forhindringer, ikke to ekstra kopier af insulintrappen.
        // Områderne har forskellig afstand og terræn; mellemstykket giver plads
        // til at vende om og se den næste rute, før man vælger den.
        const canopy=1700,hollow=2180;
        level.obstacleUnits.push({kind:'canopyLadder',name:'Canopy Ladder',x:canopy,width:400,
            entry:{x:canopy,y:154},exit:{x:canopy+400,y:154},
            challenge:'Climb staggered tree terraces; bounce from the apple to the high prize',
            alternative:'Cross the low roots or use the permanent middle terraces',
            reward:'A stomp-only diamond crown; candy and middle-route diamonds',
            recovery:'Stable ground remains after the optional apple is gone',
            features:['solid','platform','pickup','stomp'],
            bonus:{x:canopy+237,y:37,requiresStomp:true}});
        level.obstacleUnits.push({kind:'hollowRun',name:'Hollow Run',x:hollow,width:380,
            entry:{x:hollow,y:154},exit:{x:hollow+380,y:154},
            challenge:'Choose the apple hollow or climb its roof, then cross a short trench',
            alternative:'Low passage avoids the upper insulin; permanent steps permit return travel',
            reward:'Upper insulin diamonds or lower apple-contact diamonds, then a cache',
            recovery:'Wide landings on both sides of the 28-unit trench',
            features:['solid','platform','pickup'],bonus:{x:hollow+206,y:69}});
        level.encounters.push({kind:'canopyLadder',x:canopy,type:'apple',width:400},
            {kind:'hollowRun',x:hollow,type:'apple',width:380});
        const root=(x,y,w)=>platform(x,y,w,194-y,{solid:true});
        const shelf=(x,y,w)=>platform(x,y,w,8);
        platform(1680,154,500,40);
        root(canopy+45,140,50);root(canopy+150,137,42);root(canopy+313,135,46);
        shelf(canopy+106,113,50);shelf(canopy+178,91,66);shelf(canopy+255,111,50);
        // 54 enheders niveauforskel overstiger normalhoppenes 45,7. Æblets
        // tramp giver adgang til kronen, men ingen nødvendig rute afhænger af det.
        shelf(canopy+211,37,52);
        monster('apple',canopy+192,91,{speed:0,minX:canopy+192,maxX:canopy+214});
        gemRow(canopy+219,24,3);gemRow(canopy+112,99,2);gemRow(canopy+203,77,2);
        level.items.push({type:'candy',x:canopy+279,y:97});
        // En lille, lav præmie efter trærødderne ændrer efterfølgende opspring
        // uden at gentage den høje krones geometri.
        shelf(canopy+366,117,38);gemRow(canopy+373,103,2);
        level.items.push({type:'insulin',x:canopy+380,y:103});
        platform(2180,154,226,40);platform(2434,154,226,40);
        root(hollow+12,140,25);shelf(hollow+44,116,36);
        // 27 enheders luft under den hule rod: nok til DEX (23), men ikke
        // et tramp over æblet. Den synlige tagrute er det geometriske alternativ.
        platform(hollow+85,91,76,36,{solid:true});
        monster('apple',hollow+119,154,{speed:0,minX:hollow+119,maxX:hollow+141});
        gemRow(hollow+130,139,3);
        shelf(hollow+179,69,55);shelf(hollow+257,103,44);
        root(hollow+296,142,28);
        level.items.push({type:'insulin',x:hollow+204,y:55},{type:'candy',x:hollow+280,y:89});
        gemRow(hollow+196,55,3);gemRow(hollow+262,89,2);
        // Kassen har også frihøjde over den nærliggende rod, og kan nås fra
        // begge sider. Belønningspuljen forbliver slik/diamanter/æble, ingen pumpe.
        level.blocks.push({x:hollow+340,y:88,width:18,height:16,reward:'diamonds',monsterType:'apple'});
        gemRow(hollow+404,139,3);
    }
    const finishApproach=spec.encounters.length*span+extensionWidth;
    platform(finishApproach,154,340,40);
    // Æggemødet har sin egen faste figur. I finalen genindsættes eventuelle
    // manglende typer på støttet jord, så den annoncerede rollebesætning
    // faktisk mødes i banen og ikke kun findes i dens specifikation.
    const missing=spec.roster.filter(type=>!level.enemies.some(enemy=>enemy.type===type));
    for(const [slot,type] of missing.entries()) {
        const x=finishApproach+45+slot*65;
        monster(type,x,154,{minX:x,maxX:x+54});
    }
    // Frø varierer kun bonusdekoration på sikker jord. Låste risikoruter,
    // hopgeometri og præcist overlap mellem pen/diamant må ikke flyttes.
    for(let n=0;n<spec.encounters.length;n++) {
        level.diamonds.push([n*span+42+Math.floor(random()*24),137]);
    }
    // Pumper er sjældent, fast placeret udstyr, ikke gentagne kassegevinster.
    // På sene baner prioriteres den avancerede model frem for en ekstra manuel.
    const pumpTypes=new Set(['pump','autoPump']);
    const selectedPump=level.items.find(item=>item.type==='autoPump')
        ||level.items.find(item=>item.type==='pump');
    level.items=level.items.filter(item=>!pumpTypes.has(item.type)||item===selectedPump);
    for(const block of level.blocks)if(pumpTypes.has(block.reward))block.reward='diamonds';
    // Små bonusser på eksisterende stabile afsatser: ingen nye obligatoriske
    // spring eller fjendetyper. Hold afstand til andre opsamlingers hitboxes.
    function placeBonus(type,fraction){
        const candidates=level.platforms.filter(p=>!p.crumble&&p.width>=45
            &&p.y>=(type==='heart'?45:100)&&p.y<=(type==='heart'?100:145)&&p.x>120&&p.x+p.width<level.finishX-60)
            .map(p=>({x:p.x+p.width/2,y:p.y-14}))
            .filter(q=>!level.items.some(i=>Math.abs(i.x-q.x)<26&&Math.abs(i.y-q.y)<24)
                &&!level.platforms.some(p=>p.solid&&q.x+11>p.x&&q.x-11<p.x+p.width
                    &&q.y+11>p.y&&q.y-11<p.y+p.height));
        // Liv kræver en afstikker opad; vælg den højeste eksisterende bonusafsats.
        candidates.sort((a,b)=>(type==='heart'?a.y-b.y:0)||Math.abs(a.x-level.width*fraction)-Math.abs(b.x-level.width*fraction));
        if(candidates[0])level.items.push({type,...candidates[0]});
    }
    if(index%2===1)placeBonus('heart',.65);
    if(index>=1)placeBonus('superShoes',.35);
    // Ekstra madvalg mellem udfordringerne, uden nye monstertyper eller
    // ændrede portioner. Intet lægges i lave tunneler eller oven i gear.
    const edible=spec.roster.filter(type=>!['egg','avocado'].includes(type));
    for(let section=0;section<Math.floor((level.finishX-180)/420);section++){
        const center=section*420+230,candidates=[];
        for(const p of level.platforms){
            if(p.crumble||p.y!==154)continue;
            for(let x=Math.max(p.x+28,section*420+150);x<Math.min(p.x+p.width-65,section*420+390);x+=24){
                if(level.platforms.some(w=>w!==p&&x+60>w.x&&x-20<w.x+w.width&&w.y<154&&w.y+w.height>112))continue;
                if(level.blocks.some(b=>Math.abs(b.x-x)<55&&b.y+b.height>112))continue;
                if(level.items.some(i=>Math.abs(i.x-x)<42&&Math.abs(i.y-140)<27))continue;
                if(level.enemies.some(e=>x+65>e.minX&&x-65<e.maxX))continue;
                candidates.push({x,p});
            }
        }
        candidates.sort((a,b)=>Math.abs(a.x-center)-Math.abs(b.x-center));
        const spot=candidates[0];if(!spot)continue;
        if((section%2===0&&section%4!==2)||!edible.length)level.items.push({type:'candy',x:spot.x,y:140});
        else monster(edible[section%edible.length],spot.x,154,{minX:spot.x-12,maxX:spot.x+44,speed:16+index});
    }
    return level;
}

const DEXTRO_CAMPAIGN = DEXTRO_STAGE_SPECS.map((_,index)=>buildDextroStage(index));
