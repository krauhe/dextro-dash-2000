/* BG-værksted: sammenhængende madbeholder, væskesøjle og insulinventil.
 * Afspiller kun de faste motoroptagelser. Geometrien beregner aldrig BG:
 * væskehøjde = trueBG, dråber = optagelse, ventil = forsinket x1-tilstand.
 * Små sideledninger bevarer levertilførsel, baggrundsforbrug og nyretab.
 */
(function(){
    'use strict';
    const $=id=>document.getElementById(id),T=window.THREE;
    const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
    let renderer;
    try{renderer=new T.WebGLRenderer({canvas:$('scene'),alpha:true,antialias:true});}
    catch(e){$('error').hidden=false;$('error').textContent='This 3D draft needs WebGL. Try hardware acceleration.';return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
    const scene=new T.Scene(),camera=new T.OrthographicCamera(-6,6,4.5,-4.5,.1,60);
    camera.position.set(0,5.7,20);camera.lookAt(0,3.45,0);
    scene.add(new T.HemisphereLight(0xd4d9ff,0x1e1938,1.5));
    for(const [color,intensity,x,y,z] of [[0xffe7c1,2,-4,9,6],[0x71cfff,1.8,5,5,-2]]){
        const light=new T.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light);
    }
    const material=(color,glow=0)=>new T.MeshStandardMaterial({
        color,emissive:color,emissiveIntensity:glow,roughness:.32,metalness:.12});
    const metal=new T.MeshStandardMaterial({color:0x424b68,roughness:.32,metalness:.65});
    const brass=new T.MeshStandardMaterial({color:0xb99862,roughness:.4,metalness:.65});
    const glass=new T.MeshPhysicalMaterial({color:0xb8dded,roughness:.15,
        transparent:true,opacity:.13,side:T.DoubleSide,depthWrite:false});
    const blue=material(0x149fc8,.22),gold=material(0xffc761,.15);
    function mesh(geometry,mat,x,y,z=0){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);scene.add(m);return m;}
    function cylinder(radius,height,mat,x,y,z=0){
        return mesh(new T.CylinderGeometry(radius,radius,height,48),mat,x,y,z);}
    function ring(radius,mat,x,y,z=0,horizontal=true){
        const r=mesh(new T.TorusGeometry(radius,.055,10,64),mat,x,y,z);
        if(horizontal)r.rotation.x=Math.PI/2;return r;
    }
    function pipe(points,mat,radius=.07){
        const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
        mesh(new T.TubeGeometry(curve,48,radius,10,false),mat,0,0);return curve;
    }
    const deck=cylinder(5.35,.12,metal,0,-.06);deck.scale.z=.50;
    const deckRim=ring(5.25,material(0x705b9c,.1),0,.01);deckRim.scale.y=.50;

    // Mad står direkte over blodglukosen. Udløbet er fysisk forbundet gennem
    // en tragt; sukkerdråber fortsætter helt ned til den aktuelle væskeoverflade.
    const columnX=.45,columnBase=1.5,columnHeight=3.8,columnTop=columnBase+columnHeight;
    cylinder(.64,columnHeight,glass,columnX,columnBase+columnHeight/2);
    cylinder(.72,.16,metal,columnX,columnBase-.08);
    ring(.66,brass,columnX,columnTop);ring(.66,brass,columnX,columnBase);
    for(const side of [-1,1])cylinder(.035,columnHeight,metal,columnX+side*.68,columnBase+columnHeight/2,-.1);
    const liquidMaterial=material(0x229b68,.08),liquid=cylinder(.55,1,liquidMaterial,columnX,columnBase);
    const surface=cylinder(.56,.045,material(0x61d69b,.1),columnX,columnBase);
    const ripples=[0,1].map(()=>{
        const ripple=mesh(new T.TorusGeometry(.2,.012,8,40),
            new T.MeshBasicMaterial({color:0xffd278,transparent:true,depthWrite:false}),columnX,columnBase+.04);
        ripple.rotation.x=Math.PI/2;return ripple;
    });
    for(const value of [4,6,10,15,20]){
        const y=columnBase+value/22*columnHeight;
        mesh(new T.BoxGeometry(.20,.022,.035),material(value===6?0x91dcbd:0x8190a8),columnX-.81,y,.12);
    }
    const foodY=6.35;
    cylinder(.77,1.05,glass,columnX,foodY);
    ring(.78,brass,columnX,foodY+.525);ring(.78,brass,columnX,foodY-.525);
    mesh(new T.CylinderGeometry(.75,.13,.38,48,1,true),brass,columnX,foodY-.715);
    cylinder(.13,.24,brass,columnX,5.53);
    const foodFill=cylinder(.68,1,gold,columnX,foodY);
    const foodGrains=[],grainShape=new T.IcosahedronGeometry(.095,0);
    for(let i=0;i<48;i++){
        const angle=i*2.399963,radius=.55*Math.sqrt((i%12+.5)/12);
        foodGrains.push(mesh(grainShape,gold,columnX+Math.cos(angle)*radius,foodY,Math.sin(angle)*radius));
    }
    // Samme æbleasset som i spillet vises på beholderens mærkat; der genereres
    // ikke et nyt mad- eller insulinprodukt til denne læseprøve.
    const appleTexture=new T.TextureLoader().load('../assets/food-apple.png');
    const apple=new T.Sprite(new T.SpriteMaterial({map:appleTexture,transparent:true,depthWrite:false}));
    apple.position.set(columnX,foodY,.80);apple.scale.set(.7,.7,1);scene.add(apple);

    // IOB er et lagerdisplay. Den blå ledning er et signal til mekanismen,
    // aldrig en strøm der blandes med eller ophæver glukosedråberne.
    const insulinX=3.5,insulinY=4.35;
    cylinder(.48,1.65,glass,insulinX,insulinY);
    ring(.50,metal,insulinX,insulinY+.825);ring(.50,metal,insulinX,insulinY-.825);
    cylinder(.53,.16,metal,insulinX,insulinY+.91);
    const insulinFill=cylinder(.39,1,blue,insulinX,insulinY);
    for(let i=0;i<5;i++)mesh(new T.BoxGeometry(.13,.02,.03),material(0x8acedc),insulinX+.49,insulinY-.6+i*.3,.15);

    // Gennemskåret ventil: to blå skodder glider fra hinanden, så åbningen
    // faktisk kan ses. Et tandhjul følger stillingen i stedet for at snurre
    // konstant; stor IOB uden virkning åbner derfor ikke straks ventilen.
    const valveY=.83,valveZ=.85;
    pipe([[columnX,columnBase,0],[columnX,1.15,.1],[columnX,valveY,valveZ-.2]],metal,.18);
    const housing=cylinder(.59,.28,metal,columnX,valveY,valveZ-.13);housing.rotation.x=Math.PI/2;
    const aperture=mesh(new T.CircleGeometry(.43,48),new T.MeshBasicMaterial({color:0xf0a941}),columnX,valveY,valveZ+.03);
    const shutters=[];
    for(const side of [-1,1]){
        // Cirkelhalvdele, ikke firkanter: skodderne holder sig inde i huset.
        const shutter=mesh(new T.CircleGeometry(.43,32,side<0?Math.PI/2:-Math.PI/2,Math.PI),
            blue,columnX,valveY,valveZ+.065);
        shutters.push({shutter,side});
    }
    const valveRim=ring(.52,blue,columnX,valveY,valveZ+.10,false);
    for(let i=0;i<8;i++){
        const angle=i*Math.PI/4;
        mesh(new T.SphereGeometry(.045,10,8),brass,columnX+Math.cos(angle)*.52,valveY+Math.sin(angle)*.52,valveZ+.17);
    }
    const gear=new T.Group();gear.position.set(columnX+.86,valveY+.02,valveZ);scene.add(gear);
    const gearFace=new T.Mesh(new T.TorusGeometry(.22,.04,8,32),blue);gear.add(gearFace);
    for(let i=0;i<10;i++){
        const tooth=new T.Mesh(new T.BoxGeometry(.075,.075,.10),brass),angle=i*Math.PI/5;
        tooth.position.set(Math.cos(angle)*.25,Math.sin(angle)*.25,0);tooth.rotation.z=angle;gear.add(tooth);
    }
    const spoke=new T.Mesh(new T.BoxGeometry(.38,.05,.07),blue);gear.add(spoke);

    // DEX og hans væv ligger efter ventilen. Løbspulsen viser anvendelse i
    // Q2 og trækkes IKKE også fra Q1-søjlen; det ville tælle motion dobbelt.
    const dex=Dex3D.create(),dexAnchor=new T.Group();scene.add(dexAnchor);dexAnchor.add(dex.group);
    dexAnchor.position.set(-3.6,.05,.3);dexAnchor.rotation.y=.42;dexAnchor.scale.setScalar(.91);
    const activity=Dex3D.activityState(),shoeHalo=ring(.8,material(0xb279f3,.2),-3.6,.06,.3);

    // Diskrete ekstra veje: baggrundsforbrug og nyretab ligger uden om ventilen.
    // Leverens tilførsel forbliver synlig, også når COB-beholderen er tom.
    const liver=mesh(new T.SphereGeometry(1,24,16),material(0x9f6253),3.5,1.45,-.1);
    liver.scale.set(.45,.22,.27);
    const streams=[];
    function stream(kind,points,color,radius=.06,opacity=.16){
        const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
        if(kind!=='food'&&kind!=='clearance')mesh(new T.TubeGeometry(curve,48,radius,10,false),
            new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false}),0,0);
        const particleMat=new T.MeshBasicMaterial({color,transparent:true});
        const particles=[],geometry=new T.IcosahedronGeometry(kind==='food'?.067:.055,0);
        for(let i=0;i<32;i++)particles.push(mesh(geometry,particleMat,0,0));
        streams.push({kind,curve,particles,phase:0});
    }
    stream('food',[[columnX,5.41,.1],[columnX,columnBase,.1]],0xffcf70);
    stream('transport',[[columnX,valveY,valveZ+.1],[-.35,.53,1],[-1.4,.53,1],[-2.65,1,.55]],0xffd578,.14,.22);
    stream('background',[[.05,1.55,-.18],[-.5,1.32,-.16],[-1.55,.30,0],[-2.65,.36,.3]],0xb0adcb,.045,.13);
    stream('liver',[[3.06,1.45,-.1],[2.4,1.45,0],[1.4,1.65,0],[1.06,1.65,0]],0xd7a16b,.045,.14);
    stream('renal',[[1.02,1.54,-.05],[1.9,.27,.3],[2.8,.22,.2]],0xdd879d,.035,.10);
    stream('action',[[3.5,3.52,.05],[3.55,2.65,.15],[2.75,.85,.35],[1.55,valveY,valveZ]],0x42bde9,.045,.4);
    stream('clearance',[[3.7,4.4,.2],[4.2,4.65,.2],[4.65,4.95,.15]],0x79c7dc);
    const energySparks=[];
    for(let i=0;i<12;i++){
        const spark=mesh(new T.OctahedronGeometry(.07),new T.MeshBasicMaterial({
            color:0xd5aaff,transparent:true}),-3.6,.3,.7);
        energySparks.push(spark);
    }

    const labels=[];
    function label(id,classes,position,html){
        const el=document.createElement('div');el.className='tag '+classes;el.dataset.label=id;
        el.innerHTML=html;$('labels').append(el);labels.push({el,position:new T.Vector3(...position),id});return el;
    }
    label('cob','food',[columnX,7.38,.1],'FOOD / COB<strong>0 g</strong><small>waiting to be absorbed</small>');
    label('iob','insulin',[3.5,5.8,.1],'INSULIN / IOB<strong>0.0 U</strong><small>amount remaining</small>');
    label('bg','bg',[-1.02,3.6,.2],'TRUE BG<strong>6.0</strong><small>mmol/L</small>');
    label('action','insulin',[2.5,.12,1.1],'INSULIN ACTION<small>delayed valve opening</small>');
    label('foodRate','plain',[-1.18,5.28,.1],'GLUCOSE IN ↓');
    label('liver','plain',[3.5,1.98,.1],'LIVER SUPPLY');
    label('dex','plain',[-3.6,3.2,.1],'DEX / TISSUES');
    label('use','plain',[-1.2,-.04,1.1],'GLUCOSE TO TISSUES ←');
    label('clearance','plain',[4.05,5.22,.3],'CLEARED OVER TIME');
    label('high','plain',[1.4,5.13,.1],'HIGH');
    label('low','plain',[1.35,2.08,.1],'LOW');
    const notes={
        balance:'Food is empty, but liver supply and glucose use continue. The level stays steady.',
        food:'Watch the food reservoir empty into the column. Dripping follows absorption, not the amount left.',
        insulin:'Watch the blue valve: its opening can increase while the IOB reservoir gets smaller.',
        run:'Glucose reaches DEX’s tissues. Energy glints at his feet show activity, not sugar leaving his skin.'};
    let frames,caseName='insulin',minutes=0,playing=true,last=performance.now(),visualTime=0,current,valveOpening=0;
    const cache={};
    function choose(name){
        caseName=name;frames=cache[name]||(cache[name]=DexBGLearning.record(name));minutes=0;visualTime=0;playing=true;
        streams.forEach(s=>s.phase=0);$('pause').textContent='Pause';$('sceneNote').textContent=notes[name];
        document.querySelectorAll('[data-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.case===name)));
        draw(0); // Lager, ventil og scenenavn skal skifte i samme frame.
    }
    document.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>choose(b.dataset.case));
    $('pause').onclick=()=>{playing=!playing;$('pause').textContent=playing?'Pause':'Play';};
    $('replay').onclick=()=>choose(caseName);
    $('timeline').oninput=()=>{minutes=Number($('timeline').value);visualTime=minutes/4;playing=false;$('pause').textContent='Play';draw(0);};
    const projected=new T.Vector3();
    function positionLabels(){
        const w=$('scene').clientWidth,h=$('scene').clientHeight;
        for(const label of labels){
            projected.copy(label.position).project(camera);
            label.el.style.left=(projected.x*.5+.5)*w+'px';label.el.style.top=(-projected.y*.5+.5)*h+'px';
            label.el.hidden=w<600&&label.el.classList.contains('plain');
        }
    }
    function resize(){
        const w=$('scene').clientWidth,h=$('scene').clientHeight;renderer.setSize(w,h,false);
        const halfW=Math.max(5.5,4.5*w/h),halfH=halfW*h/w;
        camera.left=-halfW;camera.right=halfW;camera.top=halfH;camera.bottom=-halfH;
        camera.updateProjectionMatrix();positionLabels();
    }
    new ResizeObserver(resize).observe($('scene'));resize();choose('insulin');

    function draw(dt){
        current=DexBGLearning.sample(frames,minutes);const s=current;
        const fill=clamp(s.bg/22,.005,1)*columnHeight,waterY=columnBase+fill;
        liquid.scale.y=fill;liquid.position.y=columnBase+fill/2;surface.position.y=waterY;
        const zone=s.bg<3.9?0xe54562:s.bg>10?0xdb8c2c:0x229b68;
        liquidMaterial.color.setHex(zone);liquidMaterial.emissive.setHex(zone);surface.material.color.setHex(zone);
        ripples.forEach((r,i)=>{
            const phase=(visualTime*1.5+i*.5)%1;r.visible=s.food>.0001;
            r.position.y=waterY+.04;r.scale.setScalar(.2+phase*2.2);
            r.material.opacity=(1-phase)*.5; // Tynd ring, ikke en gul prop oven på væsken.
        });
        const foodHeight=clamp(s.cob/15,0,1)*.92;
        foodFill.visible=foodHeight>.003;foodFill.scale.y=Math.max(.001,foodHeight);
        foodFill.position.y=foodY-.46+foodHeight/2;
        foodGrains.forEach((grain,i)=>{grain.visible=foodHeight>.025&&i<Math.ceil(s.cob*5);
            grain.position.y=foodY-.46+foodHeight+.02+(i%4)*.02;});
        apple.visible=caseName!=='balance';
        const insulinHeight=clamp(s.iob/1.1,0,1)*1.45;
        insulinFill.visible=insulinHeight>.003;insulinFill.scale.y=Math.max(.001,insulinHeight);
        insulinFill.position.y=insulinY-.73+insulinHeight/2;

        // Bounded grafisk kodning af x1/baseline, IKKE en fysisk ventilformel.
        // Basalvirkning holder allerede en del åben ved IOB=0. Ingen kobling
        // til BG-tærskler, lagerets fyldning eller forslag til spillerhandlinger.
        const action=Math.max(0,s.action);
        // Forstærk små ændringer i disse faste optagelser, så de kan ses uden
        // at aflæse tal. Dette ændrer kun skoddernes tegning, aldrig fluxen.
        const amplifiedAction=Math.pow(action/1.18,6);
        valveOpening=.94*amplifiedAction/(1+amplifiedAction);
        shutters.forEach(({shutter})=>shutter.scale.x=1-valveOpening);
        // Halvskiverne flyttes udad, mens de komprimeres: en synlig spalte.
        shutters.forEach(({shutter,side})=>shutter.position.x=columnX+side*.43*valveOpening);
        gear.rotation.z=-valveOpening*Math.PI*2;
        valveRim.material.emissiveIntensity=.12+valveOpening*.4;
        for(const stream of streams){
            const signal=stream.kind==='action',clear=stream.kind==='clearance';
            const rate=signal?Math.max(0,action-1):clear?s.insulinClearance*60:s[stream.kind];
            const density=Math.abs(rate)*(signal?10:18);
            const count=Math.min(32,Math.ceil(density));
            // Svage strømme vises med dæmpning, så afrunding ikke får en
            // reel optagelseshale til pludselig at forsvinde fra billedet.
            stream.phase=((stream.phase+dt*(.25+Math.min(2,Math.abs(rate))*.18)*Math.sign(rate||1))%1+1)%1;
            stream.particles[0].material.opacity=clamp(density,0,1);
            stream.particles.forEach((p,i)=>{
                p.visible=i<count;if(!p.visible)return;
                const t=((stream.phase+i/Math.max(1,count))%1+1)%1;
                if(stream.kind==='food'){
                    p.position.set(columnX+Math.sin(i*9)*.15,5.41-t*(5.41-waterY),.18);
                    p.scale.set(1,1.5,1);
                }else{p.position.copy(stream.curve.getPoint(t));p.scale.setScalar(clear?1-t*.95:1);}
            });
        }
        const motion=s.running>.5?'run':'idle';Dex3D.advanceActivity(activity,motion,dt);
        dex.update((visualTime*(motion==='run'?1.08:.28))%1,{motion,bg:s.bg,gear:'none',cgm:true,
            lamp:s.bg<3.9?'red':s.bg>10?'orange':'green',...activity});
        const exertion=clamp(s.muscle,0,1);
        shoeHalo.material.emissiveIntensity=.03+exertion*(.2+Math.sin(visualTime*6)**2*.45);
        energySparks.forEach((spark,i)=>{
            const t=(visualTime*1.2+i/12)%1;spark.visible=exertion>.01;
            spark.position.set(-3.6+Math.sin(i*4)*(.3+t*.5),.17+t*.45,.65+Math.cos(i*4)*.45);
            spark.scale.setScalar((1-t)*(.3+exertion));
            spark.material.opacity=(1-t)*exertion;
        });
        for(const [id,value] of [['cob',s.cob.toFixed(1)+' g'],['iob',s.iob.toFixed(2)+' U'],['bg',s.bg.toFixed(1)]]){
            labels.find(l=>l.id===id).el.querySelector('strong').textContent=value;
        }
        labels.find(l=>l.id==='bg').el.querySelector('strong').style.color='#'+new T.Color(zone).getHexString();
        $('timeline').value=minutes;$('time').textContent=Math.floor(minutes)+' / 180 sim min';
        $('modelReadout').textContent=[
            'Food → blood: '+s.food.toFixed(3)+' mmol/min',
            'Liver → blood: '+s.liver.toFixed(3)+' mmol/min',
            'Net blood → tissue: '+s.transport.toFixed(3)+' mmol/min',
            'Background use: '+s.background.toFixed(3)+' mmol/min',
            'Renal loss: '+s.renal.toFixed(3)+' mmol/min',
            'Tissue disposal: '+s.disposal.toFixed(3)+' mmol/min',
            'Exercise use (in tissues): '+s.muscle.toFixed(3)+' mmol/min',
            'Transport action / starting baseline: '+s.action.toFixed(2)+'×',
            'Rapid plasma insulin clearance: '+s.insulinClearance.toFixed(4)+' U/min',
        ].join('\n');
        renderer.render(scene,camera);
    }
    window.bgLearningPreview={getSnapshot:()=>({...current,caseName,minutes,playing,valveOpening,
        liquidHeight:liquid.scale.y,foodHeight:foodFill.visible?foodFill.scale.y:0,
        insulinHeight:insulinFill.visible?insulinFill.scale.y:0,
        visibleParticles:streams.reduce((n,s)=>n+s.particles.filter(p=>p.visible).length,0),
        streams:Object.fromEntries(streams.map(s=>[s.kind,{count:s.particles.filter(p=>p.visible).length,phase:s.phase}]))})};
    document.addEventListener('visibilitychange',()=>{last=performance.now();});
    $('scene').addEventListener('webglcontextlost',event=>{event.preventDefault();playing=false;
        $('error').hidden=false;$('error').textContent='Graphics paused. Reload the workshop to continue.';});
    function tick(now){
        const dt=document.hidden?0:Math.min(.05,(now-last)/1000);last=now;
        if(playing){visualTime+=dt;minutes=Math.min(180,minutes+dt*4);
            if(minutes===180){playing=false;$('pause').textContent='Play';}}
        draw(playing?dt:0);requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
})();
