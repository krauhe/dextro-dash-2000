/* 3D-værkstedets scene, kamera og betjening. Alt kører lokalt i browseren.
   Filvalg læses kun som tekstur; intet uploades eller gemmes i spillet. */
(function(){
    'use strict';
    const $=id=>document.getElementById(id),T=window.THREE,canvas=$('scene');
    document.querySelector('aside').append($('glucosePreview').content.cloneNode(true));
    // Mundkontrollen følger modellen, så den ikke forsvinder langt nede i sidepanelet.
    const mouthControls=document.createElement('div');mouthControls.className='views';
    const mouthSlider=$('mouth').parentElement;mouthSlider.style.flex='1';mouthSlider.style.margin='0';
    mouthControls.append(mouthSlider,$('autoMouth').parentElement);
    document.querySelector('.preview').append(mouthControls);
    let renderer;
    try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});}
    catch(error){$('status').textContent='WebGL unavailable — try a browser with hardware acceleration.';return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,60);
    scene.add(new T.HemisphereLight(0xe8dbff,0x30233b,1.7));
    function light(color,intensity,x,y,z){const l=new T.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l);return l;}
    const key=light(0xffe9d1,3.1,-3,6,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
    key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-3;key.shadow.normalBias=.025;
    light(0x8a7aff,1.7,3,3,-4);light(0x8eeaff,.8,3,2,4);
    const platform=new T.Mesh(new T.CylinderGeometry(2.5,2.56,.16,96),new T.MeshStandardMaterial({color:0x242033,roughness:.75,metalness:.16}));
    platform.position.y=-.09;platform.receiveShadow=true;scene.add(platform);
    const ring=new T.Mesh(new T.TorusGeometry(2.46,.014,8,128),new T.MeshBasicMaterial({color:0x6e477e}));ring.rotation.x=Math.PI/2;ring.position.y=.006;scene.add(ring);
    let dex;
    try{dex=Dex3D.create();scene.add(dex.group);}catch(error){$('status').textContent='Model could not start: '+error.message;console.error(error);return;}
    let phase=0,playing=true,last=performance.now(),yaw=-32*Math.PI/180,pitch=.12,distance=7.0,drag=null,textureURL=null,uploadRevision=0;
    const options={motion:'idle',expression:'happy',gear:'none',stock:3,cgm:true,lamp:'green',finish:'satin',wire:false,autoMouth:true,mouth:.3};
    const activity=Dex3D.activityState();
    function sync(){
        for(const id of ['motion','expression','gear','lamp','finish'])options[id]=$(id).value;
        for(const id of ['cgm','wire','autoMouth'])options[id]=$(id).checked;
        options.stock=Number($('stock').value);options.mouth=Number($('mouth').value)/100;
        options.bg=Number($('bg').value);$('bgLabel').textContent=options.bg.toFixed(1)+' mmol/L';
        $('stockLabel').textContent=options.stock+' / 3';$('mouthLabel').textContent=options.autoMouth?'AUTO':Math.round(options.mouth*100)+'%';
        $('speedLabel').textContent=$('speed').value+'×';
    }
    function playback(value){playing=value;$('play').textContent=playing?'Pause':'Play';$('play').setAttribute('aria-pressed',String(playing));}
    $('play').onclick=()=>playback(!playing);
    $('frame').oninput=()=>{playback(false);phase=Number($('frame').value)/100;activity.clock=phase/(['inspect','curious'].includes(options.motion)?1/6:.72);activity.breathPhase=phase;};
    for(const id of ['motion','expression','gear','stock','cgm','lamp','finish','wire','autoMouth','speed'])$(id).addEventListener('input',()=>{if(id==='motion'){phase=0;activity.idleSeconds=0;}sync();});
    $('mouth').oninput=()=>{$('autoMouth').checked=false;sync();};
    $('bg').oninput=sync;
    $('skin').onchange=()=>{uploadRevision++;dex.setSkin($('skin').value);$('texture').value='';$('skinNote').textContent='Skin replaced. Geometry, joints and animations stay unchanged.';};
    $('texture').onchange=()=>{
        const file=$('texture').files[0];if(!file)return;
        if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024){$('skinNote').textContent='Choose a PNG, JPEG or WebP smaller than 12 MB.';return;}
        const revision=++uploadRevision;if(textureURL)URL.revokeObjectURL(textureURL);textureURL=URL.createObjectURL(file);const url=textureURL;
        new T.TextureLoader().load(url,texture=>{
            URL.revokeObjectURL(url);if(revision!==uploadRevision){texture.dispose();return;}
            dex.setSkin('custom',texture);$('skinNote').textContent='Local texture applied. This simple prototype UV layout may stretch painted details; production art needs a dedicated UV layout.';
        },undefined,()=>{URL.revokeObjectURL(url);$('skinNote').textContent='That image could not be opened. Choose another PNG, JPEG or WebP.';});
    };
    document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{yaw=Number(button.dataset.view)*Math.PI/180;pitch=.12;$('turntable').checked=false;});
    canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);$('turntable').checked=false;};
    canvas.onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.008;pitch=Math.max(-.25,Math.min(.7,pitch+(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY};};
    canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
    canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(4.6,Math.min(10,distance+e.deltaY*.004));},{passive:false});
    function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    new ResizeObserver(resize).observe(canvas);resize();sync();
    document.addEventListener('visibilitychange',()=>{last=performance.now();});
    function tick(now){
        const dt=Math.min(.05,(now-last)/1000);last=now;
        if(!document.hidden){
            if(playing){
                const step=dt*Number($('speed').value);
                phase=(phase+step*(['inspect','curious'].includes(options.motion)?1/6:.72))%1;
                Dex3D.advanceActivity(activity,options.motion,step);
            }
            if($('turntable').checked)yaw+=dt*.32;
            const beat=dex.update(phase,{...options,...activity,lookYaw:Math.atan2(Math.sin(yaw),Math.cos(yaw))});
            const label=beat.inspect>.1?'Inspecting a shoe':beat.curious>.1?'Looking at you':beat.effort>.35?'Catching breath':options.motion==='run'?'Running':'Waiting';
            $('activityLabel').textContent=`${label} · visual effort ${Math.round(beat.effort*100)}%`;
            camera.position.set(Math.sin(yaw)*distance,1.55+Math.sin(pitch)*distance,Math.cos(yaw)*distance);camera.lookAt(0,1.55,0);
            renderer.render(scene,camera);$('frame').value=Math.round(phase*100);$('frameLabel').textContent=String(Math.round(phase*100)).padStart(2,'0')+' / 100';
        }
        requestAnimationFrame(tick);
    }
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('status').textContent='Graphics context lost. Reload this workshop to resume.';});
    $('status').textContent='ARTICULATED MODEL · LOCAL ONLY';requestAnimationFrame(tick);
})();
