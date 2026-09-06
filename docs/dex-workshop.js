/* DEX-værkstedets renderer og betjening. Alle ændringer er lokale i denne side.
   Eksisterende billeder beskæres til visuelle dele; originale assets røres ikke.
   Armene er bevidst kodebaserede skitser, så bevægelse kan vurderes før ny art. */
(function(){
    'use strict';
    const $=id=>document.getElementById(id);
    const canvas=$('rigCanvas'),ctx=canvas.getContext('2d');
    const mini=$('smallPreview'),small=mini.getContext('2d');
    let settings=DexRig.defaults(),playing=true,phase=0,last=performance.now(),ready=false;
    const images={},cuts={};
    const files={idle:'player-monster.png',eat:'player-monster-eat.png',devour:'player-monster-devour.png',
        pump:'player-pump-overlay.png',backpack:'insulin-pump-auto.png',cgm:'player-cgm-round.png'};
    const labels={tail:'Tail',backArm:'Back arm',legs:'Legs / shoes',body:'Body / face',frontArm:'Front arm',equipment:'Equipment',cgm:'CGM'};
    for(const name of DexRig.layerNames){
        const label=document.createElement('label'),input=document.createElement('input');
        input.type='checkbox';input.checked=true;input.dataset.layer=name;
        label.append(input,document.createTextNode(labels[name]));$('layers').append(label);
        input.addEventListener('change',()=>{settings.layers[name]=input.checked;});
    }
    // De lokale udklip er cachet én gang, ikke genberegnet for hver frame.
    function cut(name,image,path){
        const c=document.createElement('canvas');c.width=c.height=1000;
        const g=c.getContext('2d');g.beginPath();path(g);g.clip();g.drawImage(image,0,0,1000,1000);cuts[name]=c;
    }
    Promise.all(Object.entries(files).map(([name,file])=>new Promise((resolve,reject)=>{
        const image=new Image();images[name]=image;image.onload=resolve;image.onerror=()=>reject(new Error(file));image.src='../assets/'+file;
    }))).then(()=>{
        for(const name of ['idle','eat','devour'])cut(name,images[name],g=>g.rect(0,0,1000,770));
        cut('leftLeg',images.idle,g=>g.rect(0,765,500,235));
        cut('rightLeg',images.idle,g=>g.rect(500,765,500,235));
        // Følg den monterede pumpes kontur i originalen, ikke hele DEX-billedet.
        cut('pump',images.pump,g=>{
            g.moveTo(291,598);g.bezierCurveTo(329,580,382,609,384,642);
            g.lineTo(364,718);g.lineTo(348,742);g.bezierCurveTo(353,769,303,778,285,751);
            g.lineTo(272,725);g.lineTo(254,701);g.lineTo(271,628);g.closePath();
        });
        ready=true;$('loadStatus').textContent='6 source images loaded. Arms and tail are motion sketches.';
    }).catch(error=>{$('loadStatus').textContent='Could not load '+error.message+'. Open this page from the project folder or local server.';});

    function ellipse(g,x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
    function attachment(g,name,x,y,draw,anchors){
        const part=settings.parts[name];g.save();g.translate(x+part.x,y+part.y);g.scale(part.scale,part.scale);draw();
        if(anchors){g.strokeStyle='#ffcf6a';g.lineWidth=.45;g.beginPath();g.moveTo(-3,0);g.lineTo(3,0);g.moveTo(0,-3);g.lineTo(0,3);g.stroke();}
        g.restore();
    }
    function arm(g,name,p,front,anchors){
        attachment(g,name,front?24:-24,-40,()=>{
            g.rotate((front?-1:1)*p.armSwing+(front?-.2:.25));
            const shade=g.createLinearGradient(-4,0,5,18);shade.addColorStop(0,'#ce67e6');shade.addColorStop(1,'#5a187b');
            g.lineCap='round';g.lineWidth=7;g.strokeStyle='#351043';g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(front?7:-5,9,2,17);g.stroke();
            g.lineWidth=5.6;g.strokeStyle=shade;g.stroke();
            ellipse(g,2,18,5,4.5,'#bdad8f');ellipse(g,2,17.2,4.5,3.8,'#fff0d5');
            g.strokeStyle='#d2bba6';g.lineWidth=.45;
            for(let n=0;n<3;n++){g.beginPath();g.moveTo(n*1.4,16);g.lineTo(n*1.4,18.5);g.stroke();}
        },anchors);
    }
    function sensor(g,p,anchors){
        if(settings.facing<0)return;
        attachment(g,'cgm',-21,-54,()=>{
            g.save();g.beginPath();g.ellipse(0,0,8,9,0,0,Math.PI*2);g.clip();
            g.drawImage(images.cgm,96,86,1062,1062,-8,-9,16,18);g.restore();
            const mode=settings.lamp,t=p.phase;
            const pulse=mode==='off'?0:mode==='red'?Math.pow(Math.max(0,Math.sin(t*Math.PI*8)),6):mode==='orange'
                ?Math.max(Math.exp(-Math.pow((t-.2)/.06,2)),Math.exp(-Math.pow((t-.4)/.06,2))):Math.pow(Math.max(0,Math.sin(t*Math.PI*2)),6);
            ellipse(g,0,0,4.6,4.6,'#03130c');g.save();g.globalAlpha=pulse;
            g.shadowColor=mode==='red'?'#ff4666':mode==='orange'?'#ffb34e':'#4df586';g.shadowBlur=4;
            ellipse(g,0,0,4.5,4.5,g.shadowColor);g.restore();
        },anchors);
    }
    // Den samme samling bruges i stor preview og lille spilskala.
    function drawDex(g,x,y,size,p,separate=false,anchors=false){
        const layers=settings.layers;g.save();g.translate(x,y);g.scale(size/100*settings.facing,size/100);
        g.translate(0,-p.bodyLift);
        const apart=separate?24:0;
        if(layers.tail){g.save();g.translate(-apart,0);g.fillStyle='#a93dd0';g.strokeStyle='#57196e';g.lineWidth=.7;g.beginPath();
            g.moveTo(-27,-29);g.bezierCurveTo(-48,-33,-58,-21+p.tail,-73,-28+p.tail);g.bezierCurveTo(-56,-17+p.tail,-41,-22,-27,-24);g.closePath();g.fill();g.stroke();g.restore();}
        if(layers.equipment&&settings.equipment==='backpack')attachment(g,'backpack',-34-apart,-50,()=>{
            const im=images.backpack;g.drawImage(im,im.width*.15,im.height*.13,im.width*.73,im.height*.74,-13,-17,26,34);
            for(let n=0;n<3;n++){g.fillStyle='#091829';g.fillRect(-10,-8+n*7,9,5);g.fillStyle=n<settings.stock?'#42deff':'#203543';g.fillRect(-9,-7+n*7,7,3);}
        },anchors);
        if(layers.backArm){g.save();g.translate(-apart,0);arm(g,'backArm',p,false,anchors);g.restore();}
        if(layers.legs)for(const [name,xpos,sign]of[['leftLeg',-20,-1],['rightLeg',21,1]]){
            g.save();g.translate(xpos, -23+apart);g.rotate(sign*p.stride);g.drawImage(cuts[name],-50-xpos,-77,100,100);g.restore();}
        if(layers.body){g.save();g.translate(0,-apart);g.drawImage(cuts[p.bodyImage],-50,-100,100,100);g.restore();}
        if(layers.equipment&&settings.equipment==='pump')attachment(g,'pump',0,0,()=>{
            g.save();g.translate(apart,0);g.strokeStyle='#30285d';g.lineWidth=4.4;g.beginPath();g.moveTo(-26,-30);g.quadraticCurveTo(1,-16,21,-23);g.stroke();g.drawImage(cuts.pump,-50,-100,100,100);g.restore();
        },anchors);
        if(layers.frontArm){g.save();g.translate(apart,0);arm(g,'frontArm',p,true,anchors);g.restore();}
        if(layers.cgm){g.save();g.translate(apart,-apart);sensor(g,p,anchors);g.restore();}
        g.restore();
    }
    function backdrop(g,w,h,mode){
        g.fillStyle=mode==='light'?'#e5e1ea':'#121222';g.fillRect(0,0,w,h);
        if(mode==='checker'){g.fillStyle='#24243b';for(let y=0;y<h;y+=24)for(let x=0;x<w;x+=24)if((x/24+y/24)%2===0)g.fillRect(x,y,24,24);}
        g.strokeStyle=mode==='light'?'#aaa2bc':'#35324d';g.lineWidth=1;g.beginPath();g.moveTo(50,h*.84);g.lineTo(w-50,h*.84);g.stroke();
    }
    function paint(){
        const p=DexRig.pose(settings.animation,phase),separate=$('separate').checked;
        backdrop(ctx,1200,900,$('background').value);
        if(ready){
            drawDex(ctx,645,780,separate?460:660,p,separate,$('anchors').checked);
            backdrop(small,320,180,'dark');drawDex(small,174,177,168,p,false,false);
        }
        const frame=Math.min(59,Math.floor(phase*60));$('frame').value=frame;
        $('frameReadout').textContent='FRAME '+String(frame+1).padStart(2,'0')+' / 60';
    }
    function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(playing)phase=(phase+dt*settings.speed)%1;paint();requestAnimationFrame(tick);}
    function playback(value){playing=value;$('playToggle').textContent=value?'Pause':'Play';$('playToggle').setAttribute('aria-pressed',String(value));}
    $('playToggle').onclick=()=>playback(!playing);
    $('step').onclick=()=>{playback(false);phase=((Math.floor(phase*60)+1)%60)/60;paint();};
    $('frame').oninput=()=>{playback(false);phase=Number($('frame').value)/60;paint();};
    for(const key of ['animation','facing','equipment','stock','lamp'])$(key).onchange=()=>{
        settings[key]=['facing','stock'].includes(key)?Number($(key).value):$(key).value;
        if(key==='animation')phase=0;
    };
    $('speed').oninput=()=>{settings.speed=Number($('speed').value);$('speedValue').textContent=settings.speed+'×';};
    function loadPart(){const part=settings.parts[$('part').value];$('offsetX').value=part.x;$('offsetY').value=part.y;$('partScale').value=part.scale;partLabels();}
    function partLabels(){$('xValue').textContent=$('offsetX').value;$('yValue').textContent=$('offsetY').value;$('scaleValue').textContent=$('partScale').value+'×';}
    $('part').onchange=loadPart;
    for(const [id,key]of[['offsetX','x'],['offsetY','y'],['partScale','scale']])$(id).oninput=()=>{settings.parts[$('part').value][key]=Number($(id).value);partLabels();};
    $('reset').onclick=()=>{
        settings=DexRig.defaults();phase=0;playback(true);
        for(const key of ['animation','facing','equipment','stock','lamp','speed'])$(key).value=settings[key];
        $('speedValue').textContent='1×';$('anchors').checked=false;$('separate').checked=false;$('background').value='dark';
        for(const box of document.querySelectorAll('[data-layer]'))box.checked=true;loadPart();
    };
    $('export').onclick=()=>{
        const blob=new Blob([JSON.stringify(DexRig.exportRig(settings),null,2)],{type:'application/json'});
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dex-visual-rig.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    requestAnimationFrame(tick);
})();
