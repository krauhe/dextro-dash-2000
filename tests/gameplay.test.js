/*
 * GAMEPLAY.TEST.JS — reproducerbare regressionstests for DEXTRO DASH.
 * DOM og lyd er stubbet. Motor, baner og gameplay køres som i browseren.
 * Interne testadgange indsættes kun i hukommelsen, aldrig i produktionsfilen.
 * Testen validerer spilregler, ikke medicinsk egnethed eller kliniske doser.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const noop = () => {};

function createGame() {
    const calls = [];
    const context = new Proxy({
        measureText: text => ({ width: text.length * 3.3 }),
        createLinearGradient: () => ({ addColorStop: noop }),
        createRadialGradient: () => ({ addColorStop: noop }),
        fillRect(...args) { calls.push({ type: 'rect', color: this.fillStyle, args }); },
        fillText(...args) { calls.push({ type: 'text', args }); },
    }, { get: (target, key) => key in target ? target[key] : noop });
    const elements = new Map();
    function element(id) {
        if (!elements.has(id)) elements.set(id, {
            textContent: '', dataset: {}, style: {}, classList: {add: noop, remove: noop, toggle: noop},
            setAttribute: noop, addEventListener: noop, focus: noop, getContext: () => context,
        });
        return elements.get(id);
    }
    const audioCalls = [];
    class AudioStub {
        constructor() {
            this.musicEnabled = false; this.effectsEnabled = true;
            return new Proxy(this, {get: (target, key) => key in target ? target[key]
                : (...args) => audioCalls.push({name: key, args})});
        }
        start() { return Promise.resolve(); }
        setMusicEnabled(value) { this.musicEnabled = value; }
        setEffectsEnabled(value) { this.effectsEnabled = value; }
    }
    const sandbox = {
        console, Math:Object.create(Math), Date, performance: {now: () => 0},
        document: {getElementById: element},
        Image: class { constructor() { this.complete = false; this.naturalWidth = 0; } },
        Path2D: class {constructor() { return new Proxy({}, {get: () => noop}); }},
        GlucoseRunnerAudio: AudioStub, addEventListener: noop, requestAnimationFrame: noop,
        setTimeout: noop, localStorage: {getItem: () => 'off', setItem: noop},
    };
    sandbox.window = sandbox; sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    for (const file of ['engine/hovorka.js', 'engine/physiology-engine.js', 'dex-activity.js', 'glucose-particles.js', 'dex-game-renderer.js', 'campaign.js', 'game.js']) {
        let source = fs.readFileSync(path.join(root, file), 'utf8');
        if (file === 'game.js') source = source.replace('    window.glucoseRunner = {', `
            window.testGame = {
                player, keys, startLevel, handleKeyDown, handleKeyUp, loseLife, finishDeath, collectObjects,
                update, updatePlayer, jump, useCandy, usePumpInsulin, updateAutoPump,
                updateHints, setMessage, updateBGAlarms, winLevel, updateStageClearTally,
                getHighBGFatigue, drawLevel, drawMessage, render, updatePizzaThrowState, updateFizzState,
                setTutorialEnabled, updateEggState, updateEnemies, updateStageObstacles, hitCacheBlock,
                updateKeyboardSketch, drawKeyboardSketch, startNextLevel,
                eatEnemy, getEatingFoodPose, updateParticles,
                getEggRenderPose,
                getHUDMealFloatPose,
                updateBananaDrop,updateBananaPeels,
                get peels(){return bananaPeels;},
                startAttractDemo, getDemoStartPositions,
                set random(value){Math.random=value;}, get demoMode(){return demoMode;},
                get tail(){return tailSegments;},
                get keyboardPickups(){return keyboardActionPickups;},
                set camera(value){cameraX=value;},
                get platforms(){return platforms;}, get blocks(){return cacheBlocks;}, get enemies(){return enemies;},
                get tutorialEnabled(){return tutorialEnabled;},
                getPickupAnimationFrame, drawDiamonds,
                set animationSeconds(value){elapsedRealSeconds=value;},
                set timer(value){remainingTimeSeconds=value;},
                get projectiles(){return cheeseProjectiles;},
                get items(){return items;}, get engine(){return physiologyEngine;},
                get diamonds(){return diamonds;}, get particles(){return particles;},
                get hint(){return activeHint;}, get hints(){return hintQueue;},
                get tally(){return stageClearTally;},
                get state(){return gameState;}, set state(value){gameState=value;},
                get cooldown(){return autoPumpCooldownSeconds;},
                set physiology(value){physiologyState={...physiologyState,...value};},
                set seconds(value){remainingTimeSeconds=value;},
                set lives(value){lives=value;},
                settleFlights(){hudPickupFlights=[];},
                stepPhys(dt){elapsedRealSeconds+=dt;updateHUDPickupFlights(dt);updatePhysiology(dt);updateAutoPump(dt);},
            };
            window.glucoseRunner = {`);
        vm.runInContext(source, sandbox, { filename: file });
    }
    return {g: sandbox.testGame, snapshot: () => sandbox.glucoseRunner.getSnapshot(),
        calls, audioCalls, element};
}

const {g, snapshot, calls, audioCalls, element} = createGame();

{
    const enemy={type:'soda',fizzState:'normal',fizzTimer:0,fizzCycleIndex:0};
    g.updateFizzState(enemy,0,0);assert.equal(enemy.fizzState,'warning');
    g.updateFizzState(enemy,0,.9);assert.equal(enemy.fizzState,'warning');
    g.updateFizzState(enemy,0,.11);assert.equal(enemy.fizzState,'shaking');
    assert.equal(enemy.fizzTimer,2);
    g.updateFizzState(enemy,0,2);assert.equal(enemy.fizzState,'normal');
    for(const phase of ['warning','shaking']){
        g.startLevel(0);const soda=g.enemies[0];
        Object.assign(soda,{type:'soda',fizzState:phase,fizzTimer:.5,speed:0,
            x:g.player.x,y:g.player.y+9,minX:g.player.x,maxX:g.player.x});
        g.player.vy=0;g.updateEnemies(0);
        assert.equal(g.state,phase==='warning'?'playing':'dying');
        assert.equal(soda.alive,false);
    }
    console.log('PASS Fizzel warns for one edible second before two dangerous seconds');
}
let passed = 0;
function check(name, run) {run(); passed++; console.log(`PASS ${name}`);}
check('Heart gives one life once; shoes activate boosted movement and reset with a new stage',()=>{
    g.startLevel(0);const before=snapshot().lives;
    const heart={type:'heart',x:g.player.x+9,y:g.player.y+10,collected:false};g.items.push(heart);
    g.collectObjects();assert.equal(snapshot().lives,before+1);
    g.collectObjects();assert.equal(snapshot().lives,before+1);
    g.items.push({type:'superShoes',x:g.player.x+9,y:g.player.y+10,collected:false});
    g.collectObjects();assert.equal(g.player.superShoesActive,true);
    g.player.onGround=true;g.jump();assert(g.player.vy < -218);
    g.keys.right=true;g.player.vx=200;g.updatePlayer(1/60);assert(g.player.vx>88);
    g.startLevel(0);assert.equal(g.player.superShoesActive,false);
});
function pick(type) {
    // Mekaniktestene må stadig prøve udstyrsskift, selv om banerne nu højst
    // indeholder én pumpe. Pumpetætheden testes separat på rigtige banedata.
    if(type==='pump'&&!g.items.some(candidate=>candidate.type===type&&!candidate.collected))
        g.items.push({type,x:g.player.x+8,y:g.player.y+10,collected:false});
    const item = g.items.find(candidate => candidate.type === type && !candidate.collected);
    assert.ok(item, `available ${type}`);
    g.player.x = item.x - 8; g.player.y = item.y - 10; g.collectObjects();
    return item;
}
const key = (value, repeat = false) => g.handleKeyDown({key: value, repeat, preventDefault: noop});

check('Real running and jumping drive cardio; rest, walls and game-over do not',()=>{
    g.startLevel(0);g.setTutorialEnabled(false);
    g.platforms.splice(0,g.platforms.length,{x:0,y:154,width:10000,height:20});
    g.blocks.splice(0);g.keys.left=false;g.keys.right=false;
    g.updatePlayer(1/60);g.stepPhys(1/60);
    assert.equal(g.engine.activeAktivitet,null,'rest at start');
    g.keys.right=true;
    for(let i=0;i<120;i++){g.updatePlayer(1/60);g.stepPhys(1/60);}
    assert.equal(g.engine.activeAktivitet.intensitet,'Medium');
    assert.equal(g.engine.activeMotion.length,1);
    assert(g.engine.getPhysiologySnapshot().exercise.e1>0);
    g.player.superShoesActive=true;g.updatePlayer(1/60);g.stepPhys(1/60);
    assert.equal(g.engine.activeAktivitet.intensitet,'Høj');
    g.keys.right=false;
    for(let i=0;i<120;i++){g.updatePlayer(1/60);g.stepPhys(1/60);}
    assert.equal(g.engine.activeAktivitet,null,'standing with shoes is rest');
    assert(g.engine.getPhysiologySnapshot().exercise.e1>0,'recovery survives stopping');
    g.jump();g.updatePlayer(1/60);g.stepPhys(1/60);
    assert.equal(g.engine.activeAktivitet.intensitet,'Høj','jumping is exertion');
    g.loseLife('TEST',true);assert.equal(g.engine.activeAktivitet,null);
    const time=g.engine.totalSimMinutes;g.stepPhys(.5);
    assert.equal(g.engine.totalSimMinutes,time,'no physiology in game-over animation');
    g.startLevel(0);assert.equal(g.player.superShoesActive,false);
    g.blocks.splice(0);g.platforms.splice(0,g.platforms.length,
        {x:0,y:154,width:10000,height:20},{x:51,y:0,width:30,height:154,solid:true});
    g.keys.right=true;g.keys.left=false;
    for(let i=0;i<60;i++){g.updatePlayer(1/60);g.stepPhys(1/60);}
    assert.equal(g.player.x,34);assert.equal(g.engine.activeAktivitet,null,'wall is not movement');
    g.keys.right=false;
});

check('Attract demos vary stage and safe interior position; camera/tail follow and player starts remain unchanged', () => {
    const overlaps=(a,b)=>a.x<b.x+b.width && a.x+a.width>b.x && a.y<b.y+b.height && a.y+a.height>b.y;
    for(let stage=0;stage<10;stage++){
        g.startLevel(stage);
        const positions=g.getDemoStartPositions();
        assert.ok(positions.length>=3,`stage ${stage+1} has multiple demo starts`);
        for(const position of positions){
            const body={...position,width:17,height:23};
            const support=g.platforms.find(p=>!p.crumble && !p.collapsed && p.y===position.y+23
                && p.x<=position.x && p.x+p.width>=position.x+17+60);
            assert.ok(support,'fully supported with forward runway');
            assert.ok(!g.platforms.some(p=>p!==support && overlaps(body,p)),'not inside a wall');
            assert.ok(!g.blocks.some(b=>overlaps(body,b)),'not inside a cache');
            assert.ok(!g.enemies.some(e=>overlaps(body,e)),'not inside an enemy');
        }
    }
    let seed=2000,previousStage=-1;
    const stages=new Set(),positions=new Set();
    g.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    // Every third demo explores a random location; the other two are fixed lessons.
    for(let run=0;run<300;run++){
        g.startAttractDemo();const state=snapshot();
        assert.ok(g.demoMode);assert.equal(g.state,'playing');
        assert.notEqual(state.stage,previousStage);previousStage=state.stage;
        assert.ok(state.x>200);assert.ok(state.cameraX>0);
        assert.ok(Math.abs(state.x-state.cameraX-80)<.001);
        assert.equal(g.player.previousY,g.player.y);
        assert.ok(Math.abs(g.tail[0].x-state.x)<20,'tail reset after relocating');
        assert.ok([4.4,6,11].some(bg=>Math.abs(state.bg-bg)<.01));assert.equal(state.cob,0);
        stages.add(state.stage);positions.add(`${state.stage}:${state.x}`);
    }
    assert.equal(stages.size,10);assert.ok(positions.size>40);
    key('ArrowRight');assert.equal(g.demoMode,false);
    assert.equal(snapshot().stage,1);assert.ok(snapshot().x<100);assert.equal(snapshot().cameraX,0);
    key('7');assert.equal(snapshot().stage,7);assert.ok(snapshot().x<100);
    g.random=Math.random;
});

check('Eating pulls the full enemy to the mouth, shrinks to zero and emits food-specific pulp once', () => {
    for (const facing of [-1,1]) {
        g.startLevel(0);
        const enemy=g.enemies[0];enemy.type='apple';enemy.x=g.player.x+facing*20;
        const meals=g.engine.activeFood.length;
        g.eatEnemy(enemy);
        assert.equal(enemy.alive,false);
        assert.equal(g.engine.activeFood.length,meals+1);
        const mouth={x:g.player.x+8+facing*5,y:g.player.y+8};
        let previousSize=Infinity;
        for(const progress of [0,.1,.25,.5,.75,.95,1]) {
            enemy.biteAnimationTime=.66*(1-progress);
            const pose=g.getEatingFoodPose(enemy,mouth);
            assert.ok(pose.size<=previousSize);previousSize=pose.size;
            if(progress===0){assert.equal(pose.size,31);assert.equal(pose.x,enemy.x+enemy.width/2);}
            if(progress===1){assert.equal(pose.size,0);assert.equal(pose.x,mouth.x);assert.equal(pose.y,mouth.y);}
        }
        enemy.biteAnimationTime=.66;
        assert.equal(g.particles.filter(p=>p.kind==='food-pulp').length,5);
        g.updateEnemies(.46);
        const pulp=g.particles.filter(p=>p.kind==='food-pulp');
        assert.equal(pulp.length,17);
        assert.ok(pulp.every(p=>['#fff0bc','#f3d88c','#fff9df'].includes(p.color)));
        g.updateEnemies(.3);g.updateEnemies(.01);
        assert.equal(g.particles.filter(p=>p.kind==='food-pulp').length,17);
        assert.equal(g.engine.activeFood.length,meals+1);
        assert.equal(enemy.biteAnimationTime,0);
        g.updateParticles(1);
        assert.equal(g.particles.filter(p=>p.kind==='food-pulp').length,0);
    }
});

check('Diamond pickup shows its bonus once without awarding immediate duplicate points', () => {
    g.startLevel(0);
    const diamond = g.diamonds[0];
    // Isolate the diamond from nearby food/equipment pickup collisions.
    diamond.x = 70; diamond.y = 30;
    g.player.x = 65; g.player.y = 25;
    const before = snapshot().score;
    g.collectObjects();
    assert.equal(diamond.collected, true);
    assert.equal(snapshot().score, before);
    assert.equal(g.particles.filter(p => p.text === '+100 BONUS').length, 1);
    g.collectObjects();
    assert.equal(g.particles.filter(p => p.text === '+100 BONUS').length, 1);
});

check('Candy and diamonds share all sixteen frames at sixteen FPS and loop in one second', () => {
    g.startLevel(0);
    for (let frame = 0; frame < 16; frame++) {
        const seconds = (frame + 0.1) / 16;
        assert.equal(g.getPickupAnimationFrame(seconds), frame);
        g.animationSeconds = seconds;
        g.drawDiamonds();
    }
    assert.equal(g.getPickupAnimationFrame(1), 0);
    assert.equal(g.getPickupAnimationFrame(2), 0);
});

check('Short taps give smaller jumps; holding preserves height and release never cuts falling or dying', () => {
    function height(holdSeconds, bg = 6) {
        g.startLevel(0); g.physiology = {bg};
        const startY = g.player.y;
        key('ArrowUp');
        let peakY = startY;
        let released = false;
        for (let time = 0; time < 2; time += 1 / 240) {
            if (!released && time >= holdSeconds) {
                g.handleKeyUp({key: 'ArrowUp'}); released = true;
            }
            g.updatePlayer(1 / 240);
            peakY = Math.min(peakY, g.player.y);
            if (g.player.vy >= 0) break;
        }
        return startY - peakY;
    }
    const short = height(0.025), medium = height(0.14), full = height(2);
    assert.ok(short < medium && medium < full);
    assert.ok(short < full * 0.5);
    g.player.vy = 20;
    g.handleKeyUp({key: 'ArrowUp'});
    assert.equal(g.player.vy, 20);
    g.startLevel(0); key('ArrowUp'); g.state = 'dying';
    const deathSpeed = g.player.vy;
    g.handleKeyUp({key: 'ArrowUp'});
    assert.equal(g.player.vy, deathSpeed);
});

check('Pizza aims for 1.4 seconds and fires at the locked position, not a moving DEX', () => {
    g.startLevel(0);
    g.player.x = 100; g.player.y = 80;
    const enemy = {type: 'pizza', x: 30, y: 80, width: 20,
        direction: 1, cheeseThrowTimer: 0, cheeseWindupTime: 0,
        cheeseThrowCycleIndex: 0};
    g.updatePizzaThrowState(enemy, 0, 0.01);
    assert.equal(enemy.cheeseWindupTime, 1.4);
    const targetX = enemy.cheeseTargetX;
    const targetY = enemy.cheeseTargetY;
    g.player.x = 180; g.player.y = 30;
    g.updatePizzaThrowState(enemy, 0, 1.2);
    assert.equal(g.projectiles.length, 0, 'no early shot');
    g.updatePizzaThrowState(enemy, 0, 0.21);
    assert.equal(g.projectiles.length, 1);
    const shot = g.projectiles[0];
    const flight = Math.max(0.72, Math.min(1.35, Math.abs(targetX - shot.x) / 105));
    assert.ok(Math.abs(shot.x + shot.vx * flight - targetX) < 1e-9);
    assert.equal(enemy.cheeseTargetY, targetY);
    assert.ok(enemy.cheeseThrowTimer >= 3.6, 'cooldown follows the shot');
    g.updatePizzaThrowState(enemy, 0, 0.1);
    assert.equal(g.projectiles.length, 1, 'no repeat shot during cooldown');
    enemy.x=1000;enemy.cheeseThrowTimer=0;
    g.updatePizzaThrowState(enemy,0,10);
    assert.equal(enemy.cheeseWindupTime,0,'distant pizzas do not attack across the level');
});

check('Held keys cannot dismiss life-loss, game-over or completed screens', () => {
    for (const state of ['life-lost', 'game-over', 'won']) {
        g.startLevel(0); g.state = state;
        key('ArrowRight', true); assert.equal(g.state, state);
        key('ArrowRight'); assert.equal(g.state, 'playing');
    }
});
check('A real low-BG death retains its reason and needs a fresh press', () => {
    g.startLevel(0); g.player.invulnerableTime = 0;
    g.loseLife('LOW BLOOD SUGAR'); g.finishDeath();
    assert.equal(element('overlaySubtitle').textContent, 'LOW BLOOD SUGAR');
    key('ArrowRight', true); assert.equal(g.state, 'life-lost');
    key('ArrowRight'); assert.equal(snapshot().lives, 2);
});
check('A lower-tier pump preserves the automatic pump and two stored doses', () => {
    g.startLevel(8); pick('autoPump'); pick('insulin'); pick('insulin');
    const beforeScore=snapshot().score, beforeSounds=audioCalls.length;
    const manual=pick('pump');
    assert.equal(manual.collected,false);
    assert.equal(snapshot().score,beforeScore);
    assert.equal(audioCalls.length,beforeSounds);
    assert.equal(snapshot().autoPumpActive, true); assert.equal(snapshot().pumpInsulinStored, 2);
});
check('Manual to automatic upgrade preserves inventory', () => {
    g.startLevel(8); pick('pump'); pick('insulin'); pick('autoPump');
    assert.equal(snapshot().autoPumpActive, true); assert.equal(snapshot().pumpInsulinStored, 1);
});
check('First three pens store; fourth pen is consumed immediately with a full pack', () => {
    for (const type of ['pump', 'autoPump']) {
        g.startLevel(8); pick(type);
        for (let index = 0; index < 3; index++) pick('insulin');
        assert.equal(snapshot().pumpInsulinStored, 3);
        assert.equal(g.player.insulinUseTime, 0);
        const before = g.engine.activeFastInsulin.length;
        const extra = pick('insulin');
        assert.equal(extra.collected, true); assert.equal(snapshot().pumpInsulinStored, 3);
        assert.equal(g.engine.activeFastInsulin.length, before + 1);
        assert.equal(g.engine.activeFastInsulin.at(-1).dose, 1);
        assert.equal(g.player.insulinUseSource, 'pen'); assert.equal(g.player.insulinUseTime, 1);
    }
});
check('A full pump also uses an extra pen at low BG, as explicitly designed', () => {
    g.startLevel(8); pick('autoPump'); for (let i = 0; i < 3; i++) pick('insulin');
    g.physiology = {trueBG: 3.5}; const before = g.engine.activeFastInsulin.length;
    pick('insulin'); assert.equal(g.engine.activeFastInsulin.length, before + 1);
});
check('First-use hints last 4 visible seconds, queue, and ignore pickup labels', () => {
    g.startLevel(8); g.setTutorialEnabled(true, false); pick('candy'); const text = g.hint.text; pick('insulin');
    assert.equal(g.hint.text, text); assert.equal(g.hint.remaining, 4);
    pick('pump'); assert.equal(g.hints.length, 1);
    g.updateHints(3); assert.equal(g.hint.text, text);
    g.updateHints(1); assert.match(g.hint.text, /MANUAL PUMP/);
    assert.equal(g.hint.remaining, 4);
});
check('Opening movement and ordinary food encounters leave players free to discover', () => {
    const {g: opening} = createGame();
    opening.setTutorialEnabled(true, false);
    opening.startLevel(0);
    // This case isolates movement/food hints, not collectible action tutorials.
    opening.items.length = 0;
    opening.update(0);
    assert.equal(opening.hint, null);
    opening.player.x = 180;
    opening.update(0);
    assert.equal(opening.hint, null);
});
check('Stationary gate apples keep their facing; walking apples turn only toward a patrol edge', () => {
    const {g: patrol} = createGame();
    patrol.startLevel(0);
    const apple = patrol.enemies.find(enemy => enemy.type === 'apple' && enemy.speed === 0);
    assert.ok(apple, 'stationary food-gate apple exists');
    const originalX = apple.x;
    for (const direction of [-1, 1]) {
        apple.direction = direction;
        for (let frame = 0; frame < 120; frame++) {
            patrol.updateEnemies(1 / 60);
            assert.equal(apple.direction, direction);
            assert.equal(apple.x, originalX);
        }
    }
    const walker = patrol.enemies.find(enemy => enemy.type === 'apple' && enemy.speed > 0);
    walker.x = walker.minX;
    walker.direction = -1;
    patrol.updateEnemies(1 / 60);
    assert.equal(walker.direction, 1);
    patrol.updateEnemies(0);
    assert.equal(walker.direction, 1, 'does not turn back while facing into the patrol');
    patrol.updateEnemies(1 / 60);
    assert.ok(walker.x > walker.minX);
    walker.x = walker.maxX - walker.width;
    walker.direction = 1;
    patrol.updateEnemies(1 / 60);
    assert.equal(walker.direction, -1);
    patrol.updateEnemies(0);
    assert.equal(walker.direction, -1);
});
check('Keyboard intro stays above DEX until camera scroll, then fades without slow motion', () => {
    const {g: intro, element: node, snapshot: state} = createGame();
    intro.setTutorialEnabled(true, false); intro.startLevel(0);
    intro.updateKeyboardSketch(10); intro.drawKeyboardSketch();
    assert.equal(node('playKeyboardMap').hidden, false);
    assert.equal(intro.hint, null);
    assert.ok(parseFloat(node('playKeyboardMap').style.top)>50);
    assert.ok(parseFloat(node('playKeyboardMap').style.left)<20);
    intro.handleKeyDown({key:'ArrowUp',repeat:false,preventDefault:noop});
    intro.updateKeyboardSketch(5); intro.drawKeyboardSketch();
    assert.equal(node('playKeyboardMap').hidden, false);
    assert.equal(node('playKeyboardMap').style.opacity,'1');
    intro.camera=1;
    intro.updateKeyboardSketch(0.4); intro.drawKeyboardSketch();
    assert.equal(Number(node('playKeyboardMap').style.opacity),0.5);
    assert.equal(node('playKeyboardMap').hidden,false);
    intro.updateKeyboardSketch(0.5); intro.drawKeyboardSketch();
    assert.equal(node('playKeyboardMap').hidden, true);
    intro.startLevel(1); intro.drawKeyboardSketch();
    assert.equal(node('playKeyboardMap').hidden, true);
    intro.startLevel(0);
    const before=state().remainingTimeSeconds;
    for(let i=0;i<60;i++)intro.update(1/60);
    assert.ok(Math.abs(before-state().remainingTimeSeconds-1)<1e-6);
    intro.setTutorialEnabled(false,false); intro.drawKeyboardSketch();
    assert.equal(node('playKeyboardMap').hidden,true);
    intro.startLevel(0); intro.drawKeyboardSketch();
    assert.equal(node('playKeyboardMap').hidden,true);
});
check('Action sketch repeats for three relevant pickups, survives stage progression, and excludes automatic equipment', () => {
    const {g: tutorial, element: node} = createGame();
    tutorial.setTutorialEnabled(true,false); tutorial.startLevel(2);
    function collect(type) {
        tutorial.items.push({type,x:40,y:45,collected:false});
        tutorial.player.x=35;tutorial.player.y=35;tutorial.collectObjects();
        tutorial.drawKeyboardSketch();
    }
    function expire() {
        tutorial.updateHints(100); tutorial.updateKeyboardSketch(6.1); tutorial.drawKeyboardSketch();
    }
    collect('insulin'); assert.equal(tutorial.keyboardPickups,0);
    collect('candy'); assert.equal(tutorial.keyboardPickups,1);
    assert.equal(node('playKeyboardMap').hidden,false);
    expire(); assert.equal(node('playKeyboardMap').hidden,true);
    collect('pump'); assert.equal(tutorial.keyboardPickups,2);
    assert.equal(node('playKeyboardMap').hidden,false);
    expire();
    collect('insulin'); assert.equal(tutorial.keyboardPickups,3);
    assert.equal(node('playKeyboardMap').hidden,false);
    expire(); collect('candy'); assert.equal(node('playKeyboardMap').hidden,true);
    tutorial.startNextLevel(); collect('candy');
    assert.equal(tutorial.keyboardPickups,3); assert.equal(node('playKeyboardMap').hidden,true);
    tutorial.startLevel(8); collect('autoPump'); collect('insulin');
    assert.equal(tutorial.keyboardPickups,0);
    collect('candy'); assert.equal(tutorial.keyboardPickups,1);
    tutorial.state='life-lost'; tutorial.drawKeyboardSketch();
    assert.equal(node('playKeyboardMap').hidden,true);
});
check('Every stationary patrol monster keeps its facing across all ten stages', () => {
    const {g: patrol} = createGame();
    let checked = 0;
    for (let stage = 0; stage < 10; stage++) {
        patrol.startLevel(stage);
        // Æggets særskilte fald/rul og pizzaens sigtning har bevidste retningsskift.
        // Isolér patruljen fra disse angreb, så testen måler kantlogikken alene.
        const stationary = patrol.enemies.filter(enemy => enemy.speed === 0 && !enemy.eggDrop);
        for (const enemy of stationary) enemy.cheeseThrowTimer = 100;
        const directions = stationary.map(enemy => enemy.direction);
        for (let frame = 0; frame < 120; frame++) {
            patrol.updateEnemies(1 / 60);
            stationary.forEach((enemy, index) => assert.equal(enemy.direction, directions[index],
                `stage ${stage + 1}: stationary ${enemy.type}`));
        }
        checked += stationary.length;
    }
    assert.ok(checked >= 10, 'covers multiple stationary encounters across the campaign');
});
check('Candy and manual insulin animate only when actually used', () => {
    g.startLevel(8); pick('candy'); assert.equal(g.player.candyUseTime, 0);
    assert.equal(g.useCandy(), true); assert.ok(g.player.candyUseTime > 0);
    assert.ok(g.player.eatAnimationTime > 0);
    pick('pump'); pick('insulin'); assert.equal(g.player.insulinUseTime, 0);
    g.usePumpInsulin(); assert.equal(snapshot().pumpInsulinStored, 0);
    assert.equal(g.player.insulinUseSource, 'pump'); assert.ok(g.player.insulinUseTime > 0);
});
check('No TIR row or TIR points remain in the tally', () => {
    g.startLevel(0); g.seconds = 30; g.winLevel();
    assert.equal(g.tally.awards.length, 2); assert.equal(g.tally.finalScore, 1500);
    assert.equal(element('overlayTitle').textContent, 'LEVEL 1 COMPLETED');
    assert.equal('tirPercent' in snapshot(), false);
});
check('BG degradation is continuous and linear in running speed and ideal jump height', () => {
    for (const bg of [6, 10, 12.25, 14.5, 16.75, 19, 23]) {
        g.startLevel(0); g.physiology = {trueBG: bg};
        const fraction = Math.min(1, Math.max(0, (bg - 10) / 9));
        assert.ok(Math.abs(g.getHighBGFatigue() - fraction) < 1e-12);
        g.player.onGround = true; g.jump();
        assert.ok(Math.abs((g.player.vy / -218) ** 2 - (1 - fraction * 0.54)) < 1e-12);
        g.keys.right = true; g.player.vx = 200; g.updatePlayer(1 / 60);
        assert.ok(Math.abs(g.player.vx - 88 * (1 - fraction * 0.5)) < 1e-12);
    }
});
check('Low and high alarms differ, are rate-limited, and have boundary hysteresis', () => {
    g.startLevel(0); audioCalls.length = 0;
    g.physiology = {trueBG: 3.8}; g.updateBGAlarms(1 / 60);
    assert.equal(audioCalls.filter(c => c.name === 'lowBGAlarm').length, 1);
    for (let i = 0; i < 60; i++) g.updateBGAlarms(1 / 60);
    assert.equal(audioCalls.filter(c => c.name === 'lowBGAlarm').length, 1);
    g.physiology = {trueBG: 3.95}; g.updateBGAlarms(0.1);
    g.physiology = {trueBG: 3.8}; g.updateBGAlarms(0.1);
    assert.equal(audioCalls.filter(c => c.name === 'lowBGAlarm').length, 1);
    g.physiology = {trueBG: 6}; g.updateBGAlarms(1 / 60);
    g.physiology = {trueBG: 12}; g.updateBGAlarms(1 / 60);
    assert.equal(audioCalls.filter(c => c.name === 'highBGAlarm').length, 1);
});
check('Pit fill is inside the visible playfield and restricted to real gaps', () => {
    g.startLevel(4); const floor=g.platforms.find(p=>p.crumble); floor.collapsed=true;
    calls.length = 0; g.drawLevel();
    const pits = calls.filter(c => c.type === 'rect' && c.color === '#0b1024');
    assert.equal(pits.length, 1);
    assert.deepEqual(pits[0].args, [floor.x, 154, 32, 14]);
    for (const pit of pits) assert.ok(pit.args[1] + 32 < 200);
});
check('Autopump reassesses current IOB and COB, and never spends multiple doses per check', () => {
    g.startLevel(8); pick('autoPump'); for (let i = 0; i < 3; i++) pick('insulin'); g.settleFlights();
    g.physiology = {trueBG: 8, cob: 20, displayIOB: 3}; g.updateAutoPump(0.1);
    assert.equal(snapshot().pumpInsulinStored, 3);
    g.physiology = {trueBG: 8, cob: 0, displayIOB: 0}; g.updateAutoPump(0.1);
    assert.equal(snapshot().pumpInsulinStored, 3);
    g.physiology = {trueBG: 8, cob: 20, displayIOB: 0}; g.updateAutoPump(0.1);
    assert.equal(snapshot().pumpInsulinStored, 2); assert.equal(g.cooldown, 8);
    g.updateAutoPump(0.1); assert.equal(snapshot().pumpInsulinStored, 2);
    g.physiology = {trueBG: 8, cob: 0, displayIOB: 3}; g.updateAutoPump(8);
    assert.equal(snapshot().pumpInsulinStored, 2);
});
check('Rendering fallback, HUD, pulse, active hint and action effects does not throw', () => {
    g.startLevel(8); pick('autoPump'); pick('candy'); g.useCandy(); pick('insulin');
    g.physiology = {trueBG: 3.5}; g.render();
    g.physiology = {trueBG: 15}; g.render();
    assert.equal(element('gameCanvas').width, 1920);
    assert.equal(element('gameCanvas').height, 1080);
    assert.equal(element('gameHint').hidden, false);
    assert.equal(element('hintPanel').hidden, false);
    assert.match(element('gameHint').textContent, /AUTO PUMP/);
    g.state = 'life-lost'; g.render();
    assert.equal(element('gameHint').hidden, true);
    assert.equal(element('hintPanel').hidden, true);
});

check('Tutorial counts down automatically and smoothly restores world speed without Enter', () => {
    g.startLevel(0);g.setTutorialEnabled(true,false);
    g.player.x=34;
    g.update(0);
    g.setMessage('HINT: Test controls',12);
    const before=snapshot().remainingTimeSeconds;
    for(let i=0;i<60;i++)g.update(1/60);
    assert.ok(Math.abs(before-snapshot().remainingTimeSeconds-0.06)<1e-6);
    assert.ok(Math.abs(g.hint.remaining-3)<1e-6);
    key('Enter');assert.ok(g.hint);
    g.render();
    assert.ok(Math.abs(element('hintTimer').value-3)<1e-6);
    assert.equal(element('hintTimer').max,4);
    g.hint.remaining=1/3;
    const ramp=snapshot().remainingTimeSeconds;
    g.update(1/60);
    assert.ok(Math.abs((ramp-snapshot().remainingTimeSeconds)*60-0.53)<1e-6);
    for(let i=0;i<61;i++)g.update(1/60);
    assert.equal(g.hint,null);
    g.render();assert.equal(element('hintPanel').hidden,true);
    g.setTutorialEnabled(false,false);
    const normal=snapshot().remainingTimeSeconds;
    for(let i=0;i<60;i++)g.update(1/60);
    assert.ok(Math.abs(normal-snapshot().remainingTimeSeconds-1)<1e-6);
});
check('Every stage renders, starts near BG 6 with no COB, and 0 selects stage 10', () => {
    g.setTutorialEnabled(false,false);
    for(let stage=0;stage<10;stage++){
        g.startLevel(stage);assert.ok(Math.abs(snapshot().bg-6)<0.1);
        assert.equal(snapshot().cob,0);g.render();
    }
    key('0');assert.equal(snapshot().stage,10);
    assert.ok(g.platforms.some(p=>p.crumble));
});
check('Solid tunnel ceiling stops upward movement and vertical sides stop horizontal movement', () => {
    g.startLevel(0);const roof=g.platforms.find(p=>p.foodGate);
    g.player.x=roof.x+8;g.player.y=131;g.player.previousY=131;g.player.onGround=true;
    g.jump();g.updatePlayer(1/30);assert.equal(g.player.y,128);assert.equal(g.player.vy,0);
    g.player.x=roof.x-20;g.player.y=100;g.player.vx=88;g.keys.right=true;
    for(let i=0;i<30;i++)g.updatePlayer(1/120);
    assert.ok(g.player.x+16<=roof.x+0.1);g.keys.right=false;
});
check('A real upward collision empties a cache once and cancels the ascent', () => {
    // Kassen vælges efter slaghøjde, ikke dens lodtrukne indhold. Den første
    // diamantkasse er nu en høj bonuskasse, som ikke kan slås fra jorden.
    g.startLevel(0);const block=g.blocks.find(b=>b.y>=105);
    g.player.x=block.x+2;g.player.y=131;g.player.onGround=true;g.jump();
    for(let i=0;i<20&&!block.used;i++)g.updatePlayer(1/120);
    assert.equal(block.used,true);assert.equal(g.player.vy,0);
    const count=g.particles.length;g.hitCacheBlock(block);assert.equal(g.particles.length,count);
});
check('Crumble floors warn, disappear permanently, and reset only on restart', () => {
    g.startLevel(4);const floor=g.platforms.find(p=>p.crumble);
    g.player.x=floor.x+4;g.player.y=130;g.player.vy=30;
    g.updatePlayer(1/30);assert.equal(floor.crumbleTime,1.1);
    g.updateStageObstacles(1);assert.equal(floor.collapsed,false);
    g.updateStageObstacles(0.11);assert.equal(floor.collapsed,true);
    g.player.y=154;g.updateStageObstacles(6);assert.equal(floor.collapsed,true);
    g.player.x=34;g.updateStageObstacles(600);assert.equal(floor.collapsed,true);
    g.startLevel(4);assert.equal(g.platforms.find(p=>p.crumble).crumbleTime,null);
});
check('Mystery caches animate a question mark, release one stage monster, and reset', () => {
    for(let stage=0;stage<10;stage++) {
        g.startLevel(stage);
        const rewards=[...new Set(g.blocks.map(b=>b.reward))];
        g.random=()=>(rewards.indexOf('monster')+.1)/rewards.length;
        const block=g.blocks.find(b=>b.reward==='monster');assert.ok(block,`stage ${stage+1}`);
        g.camera=block.x-90;g.animationSeconds=0;calls.length=0;g.drawLevel();
        assert.ok(calls.some(c=>c.type==='text'&&c.args[0]==='?'));
        const count=g.enemies.length;
        // Genuinely hit the underside, rather than calling the release directly.
        g.player.x=block.x+1;g.player.y=131;g.player.onGround=true;g.keys.right=false;g.keys.left=false;
        g.player.vx=0;g.jump();
        for(let step=0;step<60&&!block.used;step++)g.updatePlayer(1/120);
        assert.equal(block.used,true);assert.equal(g.enemies.length,count+1);
        const spawned=g.enemies.at(-1);assert.equal(spawned.type,block.monsterType);
        const startY=spawned.y;
        g.player.x=34;g.updateEnemies(.2);assert.ok(spawned.y<startY);
        assert.equal(spawned.fizzState,'normal');
        for(let i=0;i<60;i++)g.updateEnemies(1/60);
        assert.equal(spawned.cacheEntrance,null);
        assert.ok(g.platforms.some(p=>Math.abs(p.y-spawned.y-22)<.001
            &&p.x<=spawned.x&&p.x+p.width>=spawned.x+22));
        assert.ok(Number.isFinite(spawned.x));g.hitCacheBlock(block);
        assert.equal(g.enemies.length,count+1);
        g.startLevel(stage);assert.ok(g.blocks.every(b=>!b.used));
        assert.equal(g.enemies.length,count);
    }
    g.random=Math.random;
});
check('Final ten seconds beep once per displayed second and stop outside play',()=>{
    const {g:timerGame,audioCalls:tones}=createGame();
    timerGame.startLevel(0);timerGame.setTutorialEnabled(false);
    timerGame.timer=11.02;timerGame.update(.01);
    assert.equal(tones.filter(c=>c.name==='countdownBeep').length,0);
    for(let second=10;second>=1;second--){
        timerGame.timer=second+.005;timerGame.update(.01);timerGame.update(.01);
    }
    assert.equal(tones.filter(c=>c.name==='countdownBeep').length,10);
    timerGame.state='life-lost';timerGame.timer=5.005;timerGame.update(.01);
    assert.equal(tones.filter(c=>c.name==='countdownBeep').length,10);
});
check('Banana patrol turns and peel gives warning, jump clearance, slip and reset',()=>{
    g.startLevel(2);g.setTutorialEnabled(false);
    const banana=g.enemies.find(e=>e.type==='banana');assert(banana);
    assert.ok(banana.speed>0,'stage 3 banana patrol is enabled without test overrides');
    assert.ok(banana.maxX-banana.minX>banana.width+10,'patrol includes room for the entire body');
    const floor=g.platforms.find(p=>p.y===154&&p.width>=200);
    Object.assign(banana,{x:floor.x+80,y:132,speed:20,direction:1,
        minX:floor.x+30,maxX:floor.x+150,peelTimer:0});
    g.player.x=banana.x-60;g.player.y=132;
    g.updateBananaDrop(banana,.01);assert.equal(g.peels.length,0);
    assert(banana.peelThrow,'visible pull animation precedes release');
    g.updateBananaDrop(banana,.6);assert.equal(g.peels.length,0);
    g.updateBananaDrop(banana,.26);assert.equal(g.peels.length,1);
    g.updateBananaDrop(banana,.4);assert.equal(g.peels.length,1,'one peel per throw');
    assert.equal(banana.peelThrow,null,'patrol resumes');
    const peel=g.peels[0];assert.equal(peel.y,154);
    g.player.x=peel.x-8;g.player.invulnerableTime=0;
    g.updateBananaPeels(.2);assert.equal(g.state,'playing','landing grace');
    g.player.y=100;g.updateBananaPeels(.7);assert.equal(g.state,'playing','jump clears peel');
    g.player.y=132;g.updateBananaPeels(.01);assert.equal(g.state,'dying');
    g.startLevel(2);assert.equal(g.peels.length,0);
    const walker=g.enemies.find(e=>e.type==='banana');
    walker.speed=20;walker.direction=1;walker.x=walker.maxX-walker.width;
    g.player.x=0;g.updateEnemies(.01);assert.equal(walker.direction,-1);
});
check('Food miniatures drift within the liquid at changing COB levels',()=>{
    for(const cob of [0,1,5,18,40,80])for(let age=0;age<20;age+=.2){
        const pose=g.getHUDMealFloatPose(age,1,cob);
        const radius=pose.size*(Math.cos(pose.rotation)+Math.abs(Math.sin(pose.rotation)))/2;
        const top=Math.max(8,21.2-Math.max(.04,Math.min(14,cob/40*14)));
        assert(pose.y-radius>=top-1e-9&&pose.y+radius<=21.2+1e-9);
        assert(pose.x-radius>=6&&pose.x+radius<=30);
    }
    assert.notEqual(g.getHUDMealFloatPose(1,0,30).x,g.getHUDMealFloatPose(2,0,30).x);
    for(const cob of [5,18,40]){
        const oldSize=Math.min(8,Math.min(13.2,cob/40*14)*.62);
        assert.ok(g.getHUDMealFloatPose(1,0,cob).size>oldSize*1.25,'food is visibly larger');
    }
});
check('The same first cache can yield different contents on fresh attempts',()=>{
    const outcomes=new Set();
    for(const draw of [.01,.4,.8,.99]){
        g.startLevel(0);g.random=()=>draw;
        const block=g.blocks[0];g.hitCacheBlock(block);outcomes.add(block.reward);
        const reward=block.reward;g.random=()=>.5;g.hitCacheBlock(block);
        assert.equal(block.reward,reward,'used blocks cannot reroll');
        assert(!['pump','autoPump'].includes(reward),'early-stage gear stays restricted');
    }
    g.random=Math.random;
    assert(outcomes.size>=2);
});
check('Egg folds its feet, rolls off its perch, lands below and rolling contact loses a life', () => {
    g.startLevel(1);const egg=g.enemies.find(e=>e.eggDrop);
    g.player.x=egg.x-100;g.updateEggState(egg,0.01);assert.equal(egg.eggState,'warning');
    g.updateEggState(egg,1.2);assert.equal(egg.eggState,'warning');
    g.updateEggState(egg,0.21);assert.equal(egg.eggState,'rolling');
    assert.equal(egg.y+egg.height,96,'does not drop through its perch');
    assert.equal(egg.eggTuck,1);
    let fell=false;
    for(let i=0;i<360&&egg.y+egg.height<154;i++){
        g.updateEggState(egg,1/120);fell ||= egg.eggState==='falling';
    }
    assert.ok(fell);assert.equal(egg.y+egg.height,154);
    assert.equal(egg.eggState,'rolling');
    g.player.x=egg.x;g.player.y=egg.y;g.updateEnemies(0.001);assert.equal(g.state,'dying');
    g.updateEggState(egg,2.7);assert.equal(egg.eggState,'resting');
});

check('Egg collision catches thin and stacked floors, cache tops and solid walls at varied frame rates',()=>{
    for(const fps of [10,30,60,120])for(const direction of [-1,1]){
        g.startLevel(1);const egg=g.enemies.find(e=>e.eggDrop);
        g.platforms.splice(0,g.platforms.length,
            {x:0,y:130,width:400,height:20},{x:0,y:65,width:400,height:1});
        g.blocks.splice(0);
        Object.assign(egg,{x:100,y:0,direction,eggState:'falling',eggTimer:2.6,eggVelocityY:2200,eggTuck:1});
        for(let i=0;i<Math.ceil(fps*.2);i++)g.updateEggState(egg,1/fps);
        assert.equal(egg.y+egg.height,65,`${fps} FPS: highest crossed floor catches fast fall`);
        assert.equal(egg.eggVelocityY,0);
        const oldX=egg.x,oldAngle=egg.eggRotation;
        g.updateEggState(egg,1/fps);
        assert.ok(Math.abs((egg.eggRotation-oldAngle)-(egg.x-oldX)/9.2)<1e-9);

        // Det øverste gulv falder bort: den aktive kasse under det skal fange ægget.
        g.platforms[1].collapsed=true;
        g.blocks.push({x:0,y:100,width:400,height:3,solid:true});
        g.updateEggState(egg,.8);assert.equal(egg.y+egg.height,100);
        g.platforms.push({x:180,y:0,width:4,height:100,solid:true});
        Object.assign(egg,{x:150,direction:1,eggState:'rolling',eggTimer:2.6});
        g.updateEggState(egg,.3);assert.equal(egg.direction,-1);assert.ok(egg.x+22<=180);
        g.platforms.push({x:100,y:0,width:4,height:100,solid:true});
        g.updateEggState(egg,1);assert.equal(egg.direction,1);assert.ok(egg.x>=104);
    }
});

check('Rolling eggs fall at real edges and holes, while their shell rotates about its own grounded centre',()=>{
    g.startLevel(1);const egg=g.enemies.find(e=>e.eggDrop);
    g.platforms.splice(0,g.platforms.length,
        {x:100,y:70,width:60,height:12},{x:0,y:130,width:400,height:12});g.blocks.splice(0);
    Object.assign(egg,{x:125,y:48,direction:1,eggState:'rolling',eggTimer:2.6,eggVelocityY:0,eggTuck:1});
    let fell=false;
    for(let i=0;i<180;i++){g.updateEggState(egg,1/120);fell ||= egg.eggState==='falling';}
    assert.ok(fell);assert.equal(egg.y+egg.height,130);
    for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
        egg.eggRotation=angle;const pose=g.getEggRenderPose(egg);
        assert.equal(pose.x,egg.x+11);
        assert.ok(Math.abs(pose.y+pose.shellDepth-(egg.y+22))<1e-9);
        assert.ok(pose.shellDepth>7 && pose.shellDepth<10);
    }
    Object.assign(egg,{eggState:'resting',eggRotation:.8});g.updateEggState(egg,1);
    assert.ok(Math.abs(egg.eggRotation)<.001);assert.equal(egg.eggTuck,0);
    g.platforms.splice(0);g.updateEggState(egg,2);
    assert.equal(egg.alive,false,'no invisible ground under a real hole');
});
check('Enemy bounces actually reach bonus plateaus at 30 and 60 FPS', () => {
    for(const fps of [30,60]){
        g.startLevel(1);const target=g.platforms.find(p=>p.y===77);
        const enemy=g.enemies.find(e=>Math.abs(e.x-target.x)<1);
        g.player.x=enemy.x+2;g.player.y=enemy.y-22;g.player.previousY=enemy.y-24;g.player.vy=20;
        g.updateEnemies(0);assert.ok(g.player.vy<0);
        let landed=false;
        for(let i=0;i<fps*2;i++){
            g.updatePlayer(1/fps);
            if(g.player.onGround&&Math.abs(g.player.y+23-target.y)<0.01){landed=true;break;}
        }
        assert.ok(landed,`stomp plateau at ${fps} FPS`);
    }
});

check('Real alarm methods use distinct motifs and obey the effects toggle independently of music', () => {
    const scope = {window:{},console}; vm.createContext(scope);
    vm.runInContext(fs.readFileSync(path.join(root,'audio.js'),'utf8')+'\nthis.AudioClass=GlucoseRunnerAudio;',scope);
    const audio = new scope.AudioClass(); const notes=[];
    audio.tone=(...args)=>notes.push(args); audio.musicEnabled=false;
    audio.lowBGAlarm(); assert.deepEqual(notes.map(n=>n[0]),[79]);
    notes.length=0; audio.highBGAlarm(); assert.deepEqual(notes.map(n=>n[0]),[55,60]);
    audio.effectsBus={gain:{value:0.9}};audio.setEffectsEnabled(false);
    assert.equal(audio.effectsBus.gain.value,0);notes.length=0;
    audio.lowBGAlarm();audio.highBGAlarm();assert.equal(notes.length,0);
    audio.setEffectsEnabled(true);audio.lowBGAlarm();assert.equal(notes.length,1);
    assert.equal(audio.musicEnabled,false);
});

check('Biome music has distinct motifs and schedules all new voices on the music channel',()=>{
    const scope={window:{},console};vm.createContext(scope);
    vm.runInContext(fs.readFileSync(path.join(root,'audio.js'),'utf8')+'\nthis.AudioClass=GlucoseRunnerAudio;',scope);
    const motifs=[];
    for(const theme of ['dark','ice','volcano']){
        const audio=new scope.AudioClass();audio.setTheme(theme);const notes=[];
        audio.tone=(...args)=>{assert.equal(args[5],'music');notes.push(args[0]);};
        audio.sweep=(...args)=>assert.equal(args[6],'music');
        audio.noise=(...args)=>assert.equal(args[2],'music');
        for(let i=0;i<32;i++)audio.playMusicStep();
        assert.equal(audio.step,32);motifs.push(notes.join(','));
    }
    assert.equal(new Set(motifs).size,3);
});

// Kvantitativt udviklerforsøg: ingen klinisk assertion om et sikkert BG-interval.
g.startLevel(8); pick('autoPump'); for (let i = 0; i < 3; i++) pick('insulin');
g.engine.addFood({carbs:20,weight:20/27*250,eatTimeMin:1,carbParams:{simpleFraction:1,fiberPerGram:0,retentionFactor:0.4}});
g.player.invulnerableTime = 0;
let minimum = Infinity, maximum = -Infinity, previous = 3;
const doses = [];
for (let frame = 0; frame < 7200; frame++) {
    g.stepPhys(1 / 60); const state = snapshot();
    minimum = Math.min(minimum, state.bg); maximum = Math.max(maximum, state.bg);
    if (state.pumpInsulinStored < previous) {doses.push(+((frame + 1) / 60).toFixed(2)); previous = state.pumpInsulinStored;}
    if (g.state !== 'playing') break;
}
console.log(JSON.stringify({experiment:'fictional Dex / one soda / three stored doses',doses,minimum,maximum,state:g.state}));
console.log(`${passed} gameplay regression checks passed.`);
