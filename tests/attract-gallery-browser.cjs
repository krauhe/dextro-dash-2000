// Kontrollerer galleriernes indhold, rotation og start med tastatur.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
const out=path.join(__dirname,'playwright/2026-09-06_gallery');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
await page.route('**/game.js?*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('    window.glucoseRunner = {','    window.galleryTest={show:showAttractGallery,advance:updateAttractLoop}; window.glucoseRunner = {')}));
await page.goto('http://127.0.0.1:8766/index.html');await page.waitForFunction(()=>window.galleryTest);
await page.evaluate(()=>galleryTest.show(false));assert.equal(await page.locator('#attractGallery>div').count(),10);
await page.screenshot({path:path.join(out,'items.png')});
await page.evaluate(()=>galleryTest.advance(18));assert.equal(await page.locator('#overlayTitle').textContent(),'MEET THE FOOD MONSTERS');
await page.screenshot({path:path.join(out,'monsters.png')});
await page.keyboard.press('ArrowRight');assert.ok(await page.locator('#gameOverlay').evaluate(e=>e.classList.contains('hidden')));
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.txt'),'\ufeffGallery browser checks passed: 10 item cards, monster transition, keyboard start, no JS errors.\r\n');console.log('PASS galleries');
}finally{await browser.close();}
})();
