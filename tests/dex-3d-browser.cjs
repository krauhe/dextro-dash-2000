/* Isoleret browsertest af det nye artværksted; bruger kun synlige kontroller.
   Gemmer billeder under den ignorerede tests/playwright-mappe. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
    const out=path.join(__dirname,'playwright/2026-09-06_dex-3d-character');fs.mkdirSync(out,{recursive:true});
    const browser=await chromium.launch({headless:true,channel:'chrome'});
    try{
        const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
        page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
        await page.goto('http://127.0.0.1:8766/docs/dex-3d.html');await page.getByText('ARTICULATED MODEL · LOCAL ONLY').waitFor();
        await page.locator('#play').click();
        async function shot(name){await page.locator('#scene').screenshot({path:path.join(out,name+'.png')});}
        await shot('01-idle');
        for(const [motion,frame]of[['run','25'],['run','75'],['jump','50'],['eat','35']]){
            await page.locator('#motion').selectOption(motion);await page.locator('#frame').fill(frame);await page.locator('#frameLabel').filter({hasText:frame}).waitFor();await shot('02-'+motion+'-'+frame);
        }
        await page.locator('#expression').selectOption('sleepy');await shot('03-sleepy');
        await page.locator('#skin').selectOption('mint');await shot('04-mint');
        await page.locator('#texture').setInputFiles(path.join(__dirname,'../assets/player-monster.png'));await page.getByText(/Local texture applied/).waitFor();
        await page.locator('#skin').selectOption('purple');
        await page.locator('#motion').selectOption('idle');await page.locator('#expression').selectOption('happy');
        await page.locator('#gear').selectOption('backpack');await page.locator('#stock').fill('2');await page.getByRole('button',{name:'Back',exact:true}).click();await shot('05-backpack');
        await page.getByRole('button',{name:'Side',exact:true}).click();await shot('05-backpack-side');
        await page.locator('#stock').fill('0');await shot('06-empty-backpack');
        await page.locator('#gear').selectOption('pump');await page.getByRole('button',{name:'¾ view',exact:true}).click();await shot('07-pump');
        await page.locator('#wire').check();await shot('08-wire');await page.locator('#wire').uncheck();
        await page.locator('#mouth').fill('100');await shot('09-open');await page.locator('#mouth').fill('0');await shot('10-closed');
        await page.locator('#gear').selectOption('none');await page.locator('#mouth').fill('65');await page.locator('#frame').fill('25');
        await page.getByRole('button',{name:'Front',exact:true}).click();await shot('12-teeth-front');
        await page.getByRole('button',{name:'Side',exact:true}).click();await shot('13-seam-side');
        await page.locator('#skin').selectOption('clay');await shot('14-seam-clay');
        await page.locator('#skin').selectOption('purple');await page.getByRole('button',{name:'¾ view',exact:true}).click();await shot('15-green-led-and-mouth');
        await page.getByRole('button',{name:'Side',exact:true}).click();
        for(const bg of ['6','2.5','14','19']){await page.locator('#bg').fill(bg);await shot('bg-'+bg);}
        await page.locator('#bg').fill('6');await page.getByRole('button',{name:'¾ view',exact:true}).click();
        await page.locator('#autoMouth').check();
        for(const [motion,frame]of[['inspect','50'],['curious','50'],['pant','25'],['pant','75']]){
            await page.locator('#motion').selectOption(motion);await page.locator('#frame').fill(frame);await page.locator('#frameLabel').filter({hasText:frame}).waitFor();await shot('16-'+motion+'-'+frame);
        }
        await page.locator('#motion').selectOption('idle');await page.locator('#play').click();
        await page.getByText(/Inspecting a shoe/).waitFor({timeout:12000});await shot('17-automatic-idle');
        await page.locator('#motion').selectOption('run');await page.getByText(/Running/).waitFor();
        await page.getByText(/Catching breath/).waitFor({timeout:12000});await shot('18-running-effort');
        await page.locator('#play').click();
        await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'11-mobile.png'),fullPage:true});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        assert.deepEqual(errors,[]);console.log('Browser checks passed: 7 motions, timed idle gestures and running effort, expressions, skins/local file, equipment, mouth, wireframe and 390px layout.');
    }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
