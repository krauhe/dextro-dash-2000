/* DEX' 3D-model tegnes til et lille transparent WebGL-lærred og kopieres
 * ind i spillets 2D-verden. Fysik, kamera, BG og udstyr ejes stadig af game.js.
 * Ingen DOM-overlays, ekstra kollisionsboks eller fysiologiske beregninger.
 */
(function(root){
    'use strict';
    // Samme ur og puls bruges af lampen og alarmen; løbeanimationens fase
    // må aldrig styre blinkhastigheden. Én tydelig rød puls pr. 0.8 sekund.
    function lowSignal(time){
        const cycle=Math.floor(time/.8),phase=time/.8-cycle;
        return {cycle,strength:phase<.24?Math.sin(Math.PI*phase/.24):0};
    }
    function create(){
        if(!root.THREE||!root.Dex3D)return null;
        const T=root.THREE,canvas=document.createElement('canvas');
        let renderer;
        try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});}
        catch(error){console.warn('DEX 3D unavailable; using the sprite renderer.',error);return null;}
        renderer.setSize(256,256,false);renderer.setPixelRatio(1);
        renderer.outputColorSpace=T.SRGBColorSpace;
        renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
        renderer.setClearColor(0x000000,0);
        const scene=new T.Scene(),camera=new T.OrthographicCamera(-2.4,2.4,2.4,-2.4,.1,30);
        camera.position.set(0,2.3,10);camera.lookAt(0,2.3,0);camera.updateMatrixWorld();
        scene.add(new T.HemisphereLight(0xf0e7ff,0x292039,1.5));
        const key=new T.DirectionalLight(0xffeedb,2.8);key.position.set(-3,6,5);scene.add(key);
        const rim=new T.DirectionalLight(0x86beff,1.3);rim.position.set(3,3,-3);scene.add(rim);
        const dex=root.Dex3D.create();scene.add(dex.group);
        const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;
        const glowContext=glowCanvas.getContext('2d'),gradient=glowContext.createRadialGradient(32,32,1,32,32,32);
        gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.25,'rgba(255,255,255,.65)');gradient.addColorStop(1,'rgba(255,255,255,0)');
        glowContext.fillStyle=gradient;glowContext.fillRect(0,0,64,64);
        const glow=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,toneMapped:false}));
        glow.position.set(0,0,.11);glow.scale.set(.7,.7,1);dex.sensor.add(glow);
        const scale=9,span=4.8*scale,activity=root.Dex3D.activityState();
        let available=true,renderCount=0,mouthPoints=[];
        let wasGrounded=true,lastVerticalSpeed=0,landingAge=1,landingStrength=0;
        canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();available=false;});
        function reset(){Object.assign(activity,root.Dex3D.activityState());wasGrounded=true;lastVerticalSpeed=0;landingAge=1;landingStrength=0;}
        function advance(dt,player,heartRate=60,restingHeartRate=60){
            landingAge+=dt;
            if(player.onGround&&!wasGrounded){landingAge=0;landingStrength=Math.max(.2,Math.min(1,lastVerticalSpeed/240));}
            wasGrounded=player.onGround;lastVerticalSpeed=player.vy;
            const effort=root.Dex3D.breathingEffort(heartRate,restingHeartRate);
            root.Dex3D.advanceActivity(activity,player.onGround&&Math.abs(player.vx)>4?'run':'idle',dt,effort);
        }
        function project(point){point.project(camera);return {x:point.x*span/2,y:-(point.y*2.4+2.3)*scale};}
        function draw(ctx,x,feet,state){
            if(!available)return false;
            const p=state.player,eating=p.eatAnimationTime>0||p.candyUseTime>0;
            const running=p.onGround&&Math.abs(p.vx)>4;
            const motion=eating?'eat':!p.onGround?'jump':running?'run':'idle';
            const phase=eating?Math.min(.999,1-(p.eatAnimationTime>0?p.eatAnimationTime/.92:p.candyUseTime/.9)):
                !p.onGround?Math.max(.05,Math.min(.95,.5+p.vy/520)):
                running?(p.runAnimationDistance/20)%1:(p.animationTime*.72)%1;
            const options={...activity,motion,bg:state.bg,gear:state.gear,stock:state.stock,superShoes:p.superShoesActive,
                verticalSpeed:p.vy,landing:landingAge<.5?landingStrength*Math.exp(-landingAge*9)*Math.cos(landingAge*17):0,
                expression:state.fatigue>.55?'sleepy':state.fatigue>.1?'grumpy':'happy',
                cgm:true,lookYaw:-p.facing*.65,autoMouth:true};
            if(p.eatAnticipation>0&&!eating){options.autoMouth=false;options.mouth=.36+.64*p.eatAnticipation;}
            // Hold munden helt åben under indtrækningen. Den tidligere sinus-
            // pose lukkede læberne, før fjenden var færdig med at krympe.
            if(p.eatAnimationTime>0){options.autoMouth=false;options.mouth=.18+.82*Math.min(1,p.eatAnimationTime/.24);}
            dex.update(phase,options);
            // Spillets parabel bestemmer springet. Værkstedets ekstra løft må
            // ikke få skoene til at svæve væk fra den eksisterende hitbox.
            dex.group.position.y=-.18;dex.group.position.x=0;
            dex.group.rotation.y=p.facing*1.02;
            const low=Math.max(0,Math.min(1,(5.2-state.bg)/2.4));
            const high=Math.max(0,Math.min(1,(state.bg-8)/10));
            const severity=Math.max(low,high),period=1.32-low*.78+high*.18,t=(state.time/period)%1;
            const peak=center=>{const d=Math.abs(t-center);return Math.exp(-Math.pow(Math.min(d,1-d)/.075,2));};
            const lowAlarm=state.lowAlarm??state.bg<4;
            const strength=lowAlarm?lowSignal(state.time).strength:Math.max(peak(.13),peak(.34)*high);
            const lampColor=new T.Color(0x10cb3d).lerp(new T.Color(low>0?0xe82746:0xed8a13),severity);
            if(lowAlarm)lampColor.set(0xff1744);
            dex.lamp.material.color.set(0x032310).lerp(lampColor,strength);
            glow.material.color.copy(lampColor);glow.material.opacity=strength*.9;
            glow.scale.setScalar(.55+strength*.35);
            scene.updateMatrixWorld(true);
            // Projektion af den faktiske mundkant bruges til det spiste monster.
            const positions=dex.faceGeometry.attributes.position;
            mouthPoints=[];
            for(let i=0;i<80;i+=2)mouthPoints.push(project(new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(dex.torso.matrixWorld)));
            renderer.render(scene,camera);renderCount++;
            ctx.save();ctx.translate(x,feet);
            if(state.dying){ctx.translate(0,-13);ctx.rotate(p.animationTime*5.2);ctx.translate(0,13);}
            ctx.drawImage(canvas,-span/2,-4.7*scale,span,span);ctx.restore();return true;
        }
        function drawFood(ctx,image,x,feet,food,facing){
            if(!available||mouthPoints.length===0)return;
            ctx.save();ctx.translate(x,feet);ctx.beginPath();
            mouthPoints.forEach((p,i)=>{i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});
            ctx.closePath();ctx.clip();
            paintFood(ctx,image,food,x,feet);ctx.restore();
            // Den ydre del ses foran læberne, den indre kun gennem mundhullet.
            // To adskilte klip undgår at tegne fjenden oven på øjne/kinder.
            const lip=facing>0?Math.max(...mouthPoints.map(p=>p.x)):Math.min(...mouthPoints.map(p=>p.x));
            ctx.save();ctx.translate(x,feet);ctx.beginPath();
            ctx.rect(facing>0?lip:lip-1000,-1000,1000,2000);ctx.clip();
            paintFood(ctx,image,food,x,feet);ctx.restore();
        }
        function paintFood(ctx,image,food,x,feet){
            if(food.size<=0)return;
            ctx.translate(food.x-x,food.y-feet);ctx.rotate(food.rotation);
            ctx.scale(food.direction,1);
            ctx.drawImage(image,-food.size/2,-food.size/2,food.size,food.size);
        }
        return {draw,drawFood,advance,reset,
            get mouthAnchor(){return mouthPoints.length?mouthPoints.reduce((a,p)=>({x:a.x+p.x/mouthPoints.length,y:a.y+p.y/mouthPoints.length}),{x:0,y:0}):{x:5,y:-12};},
            get available(){return available;},get renderCount(){return renderCount;}};
    }
    root.DexGameRenderer={create,lowSignal};
})(globalThis);
