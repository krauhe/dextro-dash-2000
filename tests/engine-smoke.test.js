/*
 * ENGINE-SMOKE.TEST.JS - Minimal compatibility check for synchronized files.
 *
 * Both browser-global scripts are evaluated in one isolated context, matching
 * their load order in index.html. The test verifies that the public factory can
 * create, initialize and advance a finite physiological state.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');
const context = vm.createContext({ console, Math, Date });
context.window = context;
context.globalThis = context;

for (const relativePath of ['engine/hovorka.js', 'engine/physiology-engine.js']) {
    const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    vm.runInContext(source, context, { filename: relativePath });
}

assert.equal(
    typeof context.T1DPhysiologyEngine?.createEngine,
    'function',
    'The browser-global physiology factory must be available.',
);

const engine = context.T1DPhysiologyEngine.createEngine(
    { weight: 70, isf: 3, icr: 10 },
    { noise: false, seed: 1987 },
);
engine.initSteadyState({ targetBG: 6 });
engine.step(1);

const state = engine.getState();
assert.ok(Number.isFinite(state.trueBG), 'trueBG must remain finite after one step.');
assert.ok(state.trueBG > 2 && state.trueBG < 20, 'trueBG must remain physiologically bounded.');

console.log(`Engine smoke test passed at true BG ${state.trueBG.toFixed(3)} mmol/L.`);
