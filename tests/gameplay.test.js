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
            textContent: '', dataset: {}, classList: {add: noop, remove: noop, toggle: noop},
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
    for (const file of ['engine/hovorka.js', 'engine/physiology-engine.js', 'level-01.js', 'level-02.js', 'game.js']) {
        let source = fs.readFileSync(path.join(root, file), 'utf8');
        if (file === 'game.js') source = source.replace('    window.glucoseRunner = {', `
            window.testGame = {
                player, keys, startLevel, handleKeyDown, handleKeyUp, loseLife, finishDeath, collectObjects,
                update, updatePlayer, jump, useCandy, usePumpInsulin, updateAutoPump,
                updateHints, setMessage, updateBGAlarms, winLevel, updateStageClearTally,
                getHighBGFatigue, drawLevel, drawMessage, render, updatePizzaThrowState,
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
    g.startLevel(1); pick('autoPump'); pick('insulin'); pick('insulin'); pick('pump');
    assert.equal(snapshot().autoPumpActive, true); assert.equal(snapshot().pumpInsulinStored, 2);
});
check('Manual to automatic upgrade preserves inventory', () => {
    g.startLevel(1); pick('pump'); pick('insulin'); pick('autoPump');
    assert.equal(snapshot().autoPumpActive, true); assert.equal(snapshot().pumpInsulinStored, 1);
});
check('First three pens store; fourth pen is consumed immediately with a full pack', () => {
    for (const type of ['pump', 'autoPump']) {
        g.startLevel(1); pick(type);
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
    g.startLevel(1); pick('autoPump'); for (let i = 0; i < 3; i++) pick('insulin');
    g.physiology = {trueBG: 3.5}; const before = g.engine.activeFastInsulin.length;
    pick('insulin'); assert.equal(g.engine.activeFastInsulin.length, before + 1);
});
check('First-use hints last 12 visible seconds, queue, and ignore pickup labels', () => {
    g.startLevel(1); pick('candy'); const text = g.hint.text; pick('insulin');
    assert.equal(g.hint.text, text); assert.equal(g.hint.remaining, 12);
    pick('pump'); assert.equal(g.hints.length, 1);
    g.updateHints(11); assert.equal(g.hint.text, text);
    g.updateHints(1); assert.match(g.hint.text, /MANUAL PUMP/);
    assert.equal(g.hint.remaining, 12);
});
check('Candy and manual insulin animate only when actually used', () => {
    g.startLevel(1); pick('candy'); assert.equal(g.player.candyUseTime, 0);
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
    g.startLevel(0); calls.length = 0; g.drawLevel();
    const pits = calls.filter(c => c.type === 'rect' && c.color === '#0b1024');
    assert.equal(pits.length, 5);
    assert.deepEqual(pits[0].args, [610, 154, 52, 14]);
    for (const pit of pits) assert.ok(pit.args[1] + 32 < 200);
});
check('Autopump reassesses current IOB and COB, and never spends multiple doses per check', () => {
    g.startLevel(1); pick('autoPump'); for (let i = 0; i < 3; i++) pick('insulin'); g.settleFlights();
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
    g.startLevel(1); pick('autoPump'); pick('candy'); g.useCandy(); pick('insulin');
    g.physiology = {trueBG: 3.5}; g.render();
    g.physiology = {trueBG: 15}; g.render();
    assert.equal(element('gameCanvas').width, 1920);
    assert.equal(element('gameCanvas').height, 1080);
    assert.equal(element('gameHint').hidden, false);
    assert.match(element('gameHint').textContent, /AUTO PUMP/);
    g.state = 'life-lost'; g.render();
    assert.equal(element('gameHint').hidden, true);
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

// Kvantitativt udviklerforsøg: ingen klinisk assertion om et sikkert BG-interval.
g.startLevel(1); pick('autoPump'); for (let i = 0; i < 3; i++) pick('insulin');
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
