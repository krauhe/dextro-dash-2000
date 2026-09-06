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
        console, Math, Date, performance: {now: () => 0},
        document: {getElementById: element},
        Image: class { constructor() { this.complete = false; this.naturalWidth = 0; } },
        Path2D: class {constructor() { return new Proxy({}, {get: () => noop}); }},
        GlucoseRunnerAudio: AudioStub, addEventListener: noop, requestAnimationFrame: noop,
        setTimeout: noop, localStorage: {getItem: () => 'off', setItem: noop},
    };
    sandbox.window = sandbox; sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    for (const file of ['engine/hovorka.js', 'engine/physiology-engine.js', 'campaign.js', 'game.js']) {
        let source = fs.readFileSync(path.join(root, file), 'utf8');
        if (file === 'game.js') source = source.replace('    window.glucoseRunner = {', `
            window.testGame = {
                player, keys, startLevel, handleKeyDown, handleKeyUp, loseLife, finishDeath, collectObjects,
                update, updatePlayer, jump, useCandy, usePumpInsulin, updateAutoPump,
                updateHints, setMessage, updateBGAlarms, winLevel, updateStageClearTally,
                getHighBGFatigue, drawLevel, drawMessage, render, updatePizzaThrowState,
                setTutorialEnabled, updateEggState, updateEnemies, updateStageObstacles, hitCacheBlock,
                updateKeyboardSketch, drawKeyboardSketch, startNextLevel,
                get keyboardPickups(){return keyboardActionPickups;},
                set camera(value){cameraX=value;},
                get platforms(){return platforms;}, get blocks(){return cacheBlocks;}, get enemies(){return enemies;},
                get tutorialEnabled(){return tutorialEnabled;},
                getPickupAnimationFrame, drawDiamonds,
                set animationSeconds(value){elapsedRealSeconds=value;},
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
let passed = 0;
function check(name, run) {run(); passed++; console.log(`PASS ${name}`);}
function pick(type) {
    const item = g.items.find(candidate => candidate.type === type && !candidate.collected);
    assert.ok(item, `available ${type}`);
    g.player.x = item.x - 8; g.player.y = item.y - 10; g.collectObjects();
    return item;
}
const key = (value, repeat = false) => g.handleKeyDown({key: value, repeat, preventDefault: noop});

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
    g.startLevel(8); pick('autoPump'); pick('insulin'); pick('insulin'); pick('pump');
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
check('First-use hints last 12 visible seconds, queue, and ignore pickup labels', () => {
    g.startLevel(8); g.setTutorialEnabled(true, false); pick('candy'); const text = g.hint.text; pick('insulin');
    assert.equal(g.hint.text, text); assert.equal(g.hint.remaining, 12);
    pick('pump'); assert.equal(g.hints.length, 1);
    g.updateHints(11); assert.equal(g.hint.text, text);
    g.updateHints(1); assert.match(g.hint.text, /MANUAL PUMP/);
    assert.equal(g.hint.remaining, 12);
});
check('Opening movement and ordinary food encounters leave players free to discover', () => {
    const {g: opening} = createGame();
    opening.setTutorialEnabled(true, false);
    opening.startLevel(0);
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
    assert.ok(Math.abs(g.hint.remaining-11)<1e-6);
    key('Enter');assert.ok(g.hint);
    g.render();
    assert.ok(Math.abs(element('hintTimer').value-11)<1e-6);
    assert.equal(element('hintTimer').max,12);
    g.hint.remaining=1;
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
    g.startLevel(0);const block=g.blocks.find(b=>b.reward==='diamonds');
    g.player.x=block.x+2;g.player.y=131;g.player.onGround=true;g.jump();
    for(let i=0;i<20&&!block.used;i++)g.updatePlayer(1/120);
    assert.equal(block.used,true);assert.equal(g.player.vy,0);
    const count=g.particles.length;g.hitCacheBlock(block);assert.equal(g.particles.length,count);
});
check('Crumble floors warn, disappear, reform safely, and reset on restart', () => {
    g.startLevel(4);const floor=g.platforms.find(p=>p.crumble);
    g.player.x=floor.x+4;g.player.y=130;g.player.vy=30;
    g.updatePlayer(1/30);assert.equal(floor.crumbleTime,1.1);
    g.updateStageObstacles(1);assert.equal(floor.collapsed,false);
    g.updateStageObstacles(0.11);assert.equal(floor.collapsed,true);
    g.player.y=154;g.updateStageObstacles(6);assert.equal(floor.collapsed,true);
    g.player.x=34;g.updateStageObstacles(0.1);assert.equal(floor.collapsed,false);
    g.startLevel(4);assert.equal(g.platforms.find(p=>p.crumble).crumbleTime,null);
});
check('Egg gives warning, then falls and rolls; rolling contact loses a life', () => {
    g.startLevel(1);const egg=g.enemies.find(e=>e.eggDrop);
    g.player.x=egg.x-100;g.updateEggState(egg,0.01);assert.equal(egg.eggState,'warning');
    g.updateEggState(egg,1.2);assert.equal(egg.eggState,'warning');
    g.updateEggState(egg,0.21);assert.equal(egg.eggState,'falling');
    for(let i=0;i<120&&egg.eggState==='falling';i++)g.updateEggState(egg,1/120);
    assert.equal(egg.eggState,'rolling');
    g.player.x=egg.x;g.player.y=egg.y;g.updateEnemies(0.001);assert.equal(g.state,'dying');
    g.updateEggState(egg,2.7);assert.equal(egg.eggState,'resting');
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
    audio.lowBGAlarm(); assert.deepEqual(notes.map(n=>n[0]),[79,76,72]);
    notes.length=0; audio.highBGAlarm(); assert.deepEqual(notes.map(n=>n[0]),[55,60]);
    audio.effectsBus={gain:{value:0.9}};audio.setEffectsEnabled(false);
    assert.equal(audio.effectsBus.gain.value,0);notes.length=0;
    audio.lowBGAlarm();audio.highBGAlarm();assert.equal(notes.length,0);
    audio.setEffectsEnabled(true);audio.lowBGAlarm();assert.equal(notes.length,3);
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
