/* DEX som selvstændig 3D-artmodel. Y er op; ansigtet peger mod +Z.
   Delene har rigtige led/monteringspunkter. Mundens ring-topologi efterlader
   et fysisk hul i hovedet, så mørk mund, tænder og tunge har deres egen dybde.
   Ingen fysiologimotor, behandlingslogik eller globale spilvariable bruges. */
(function(root){
    'use strict';
    const T=root.THREE, TAU=Math.PI*2;
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
    // Visuel spilkurve, ikke en fysiologisk model eller behandlingsgrænse.
    function bgDroop(bg=6){return smooth(Math.max((4-bg)/1.5,(bg-10)/9));}
    // Kun visuel aktivitet. Spillets fremtidige integration kan levere indsats
    // fra sin egen bevægelse; der beregnes ingen BG-ændring eller behandling her.
    function activityState(){return {clock:0,idleSeconds:0,effort:0,breathPhase:0};}
    function advanceActivity(state,motion,seconds){
        const dt=clamp(seconds,0,.1);state.clock+=dt;
        state.idleSeconds=motion==='idle'?state.idleSeconds+dt:0;
        const previousEffort=state.effort;
        state.effort=clamp(state.effort+(motion==='run'?dt/14:-dt/18),0,1);
        // Integreret fase bevarer hvert åndedrag, selv når frekvensen ændres.
        const breathingEffort=motion==='pant'?1:(previousEffort+state.effort)/2;
        state.breathPhase=(state.breathPhase+dt*(.4+breathingEffort*1.15))%1;
        return state;
    }
    function characterBeat(motion,phase,options){
        const envelope=t=>smooth(t/.9)*smooth((6-t)/1.1);
        const clock=options.clock??phase/0.72,effort=motion==='pant'?1:clamp(options.effort||0,0,1);
        const idle=options.idleSeconds||0,beat=((Math.max(0,idle-4))%18);
        let inspect=0,curious=0;
        if(motion==='inspect')inspect=envelope(phase*6);
        else if(motion==='curious')curious=envelope(phase*6);
        else if(motion==='idle'&&idle>4){inspect=beat<6?envelope(beat):0;curious=beat>=9&&beat<15?envelope(beat-9):0;}
        inspect*=1-effort;curious*=1-effort;
        const breath=(Math.sin((options.breathPhase??clock*(.4+effort*1.15))*TAU)+1)/2;
        return {inspect,curious,effort,breath,clock};
    }
    function pose(motion,phase){
        const t=((phase%1)+1)%1,w=Math.sin(t*TAU),run=motion==='run',jump=motion==='jump',eat=motion==='eat';
        const airborne=jump?Math.sin(Math.PI*t)**2:0;
        const reach=eat?Math.sin(Math.PI*clamp(t/.75,0,1))**2:0;
        return {t,lift:jump?airborne*.75:run?.035*(1-Math.cos(t*TAU*2)):.012*w,
            stride:run?w*.65:jump?-.4*airborne:0,
            knee:run?Math.max(0,-w)*.8:jump?airborne*.95:0,
            otherKnee:run?Math.max(0,w)*.8:jump?airborne*.95:0,
            arm:run?-w*.6:jump?-1.9*airborne:eat?-1.65*reach:.04*w,
            mouth:eat?.22+.78*reach:run?.40:.36,reach,
            lean:run?.1:eat?.15*reach:0};
    }
    function create(){
        const group=new T.Group();group.name='DEX';
        const skin=new T.MeshStandardMaterial({color:0x9828c7,roughness:.42,metalness:.03,side:T.DoubleSide});
        const purpleDark=new T.MeshStandardMaterial({color:0x592078,roughness:.48});
        const teal=new T.MeshStandardMaterial({color:0x02bfb9,roughness:.23,metalness:.12});
        const cream=new T.MeshStandardMaterial({color:0xffedca,roughness:.48});
        const white=new T.MeshStandardMaterial({color:0xfffaf1,roughness:.24});
        const dark=new T.MeshStandardMaterial({color:0x080813,roughness:.3});
        const shoeLeather=new T.MeshStandardMaterial({color:0x08787d,roughness:.38,metalness:.05});
        const shoePanel=new T.MeshStandardMaterial({color:0x09525d,roughness:.55});
        const shoeStitch=new T.MeshStandardMaterial({color:0x63aaa2,roughness:.65});
        const rubber=new T.MeshStandardMaterial({color:0x172e37,roughness:.85});
        const midsole=new T.MeshStandardMaterial({color:0xcac5ab,roughness:.73});
        const materials=[skin,purpleDark,teal,cream,white,dark,shoeLeather,shoePanel,shoeStitch,rubber,midsole];
        const sphere=new T.SphereGeometry(1,32,24);
        function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
        function ball(parent,material,x,y,z,sx,sy,sz){const m=mesh(parent,sphere,material,x,y,z);m.scale.set(sx,sy,sz);return m;}
        function joint(parent,x,y,z,name){const g=new T.Group();g.position.set(x,y,z);g.name=name||'';parent.add(g);return g;}
        function tube(parent,points,radius,material){return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,radius,8,false),material);}
        // Rødderne sidder under kroppen; hele skoen er volumen, ikke et udklip.
        const legs=[];
        for(const sign of [-1,1]){
            const hip=joint(group,sign*.43,.88,0,'hip');
            ball(hip,skin,0,-.16,0,.19,.28,.2);
            const knee=joint(hip,0,-.31,0,'knee');ball(knee,skin,0,-.13,0,.145,.22,.15);
            const foot=joint(knee,0,-.31,.11,'shoe');
            ball(foot,midsole,0,.015,.075,.275,.095,.41);
            ball(foot,shoeLeather,0,.13,.07,.26,.20,.385);
            ball(foot,shoePanel,0,.29,-.015,.115,.047,.19);
            const cuff=mesh(foot,new T.TorusGeometry(.164,.048,10,32),shoePanel,0,.27,-.055);cuff.rotation.x=Math.PI/2;
            // Tåkappe, side-syninger, snørehuller og rillet ydersål følger skoen
            // som geometri. Sålen kan derfor inspiceres, når DEX løfter foden.
            const cap=[];for(let n=0;n<=14;n++){const x=-.23+n/14*.46;cap.push([x,.20,.078+.385*Math.sqrt(Math.max(0,1-(x/.26)**2-.35**2))]);}tube(foot,cap,.009,shoePanel);
            for(const side of [-1,1]){
                for(let n=0;n<9;n++){const angle=.62+n*.20;const point=a=>[side*.259*Math.sin(a),.09,.075+.375*Math.cos(a)];tube(foot,[point(angle),point(angle+.055)],.005,shoeStitch);}
                for(let n=0;n<2;n++)tube(foot,[[side*.252,.14,-.07+n*.09],[side*.242,.22,-.01+n*.09]],.016,shoePanel);
            }
            for(let i=0;i<3;i++){
                for(const side of [-1,1])ball(foot,rubber,side*.127,.29-i*.02,.12+i*.065,.028,.015,.026);
                tube(foot,[[-.13,.30-i*.02,.12+i*.065],[0,.32-i*.02,.13+i*.065],[.13,.30-i*.02,.12+i*.065]],.012,midsole);
            }
            for(let i=0;i<8;i++){
                const z=-.22+i*.085,width=.48*Math.sqrt(Math.max(0,1-((z-.075)/.41)**2));
                const tread=mesh(foot,new T.BoxGeometry(width,.024,.036),rubber,0,-.059,z);tread.name='sole-tread';
            }
            const loop=mesh(foot,new T.TorusGeometry(.049,.012,8,20),shoeStitch,0,.28,-.25);loop.scale.y=1.4;
            legs.push({hip,knee,foot});
        }
        const torso=joint(group,0,1.63,0,'body');
        // Annulus: den indre kant følger mundåbningen, den ydre hovedets profil.
        // Indekser og UV'er oprettes én gang; kun positioner/normale ændres.
        const rings=18,segments=80,vertices=[],uv=[],indices=[];
        for(let r=0;r<=rings;r++)for(let a=0;a<=segments;a++){vertices.push(0,0,0);uv.push(a/segments,r/rings);}
        for(let r=0;r<rings;r++)for(let a=0;a<segments;a++){const i=r*(segments+1)+a;indices.push(i,i+segments+1,i+1,i+1,i+segments+1,i+segments+2);}
        const faceGeometry=new T.BufferGeometry();faceGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));faceGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));faceGeometry.setIndex(indices);
        const face=mesh(torso,faceGeometry,skin);
        // Fælles ellipsoide, kantpunkter og analytiske normaler giver samme
        // lysrespons på begge sider. UV-sømmen ligger på ryggens midterlinje.
        function surfaceUV(x,y,z){return [.5+Math.atan2(x/1.02,z/.84)/TAU,.5+Math.asin(clamp(y/1.08,-1,1))/Math.PI];}
        function surfaceNormal(x,y,z){return new T.Vector3(x/(1.02**2),y/(1.08**2),z/(.84**2)).normalize();}
        const backPositions=[],backNormals=[],backUV=[];
        function backPoint(r,a){
            const depth=r/rings*Math.PI/2,angle=a/segments*TAU;
            return [1.02*Math.cos(depth)*Math.cos(angle),1.08*Math.cos(depth)*Math.sin(angle),-.84*Math.sin(depth)];
        }
        function backTriangle(points){
            const uvs=points.map(p=>surfaceUV(...p));
            // Duplicerede trekantpunkter tillader 0/1-sømmen uden interpolation
            // gennem hele teksturen. RepeatWrapping forbinder de to kanter.
            if(Math.max(...uvs.map(p=>p[0]))-Math.min(...uvs.map(p=>p[0]))>.5)for(const p of uvs)if(p[0]<.5)p[0]+=1;
            points.forEach((p,i)=>{backPositions.push(...p);backNormals.push(...surfaceNormal(...p).toArray());backUV.push(...uvs[i]);});
        }
        for(let r=0;r<rings;r++)for(let a=0;a<segments;a++){
            backTriangle([backPoint(r,a),backPoint(r+1,a),backPoint(r,a+1)]);
            if(r<rings-1)backTriangle([backPoint(r,a+1),backPoint(r+1,a),backPoint(r+1,a+1)]);
        }
        const backGeometry=new T.BufferGeometry();
        backGeometry.setAttribute('position',new T.Float32BufferAttribute(backPositions,3));
        backGeometry.setAttribute('normal',new T.Float32BufferAttribute(backNormals,3));
        backGeometry.setAttribute('uv',new T.Float32BufferAttribute(backUV,2));
        mesh(torso,backGeometry,skin);
        faceGeometry.setAttribute('normal',new T.Float32BufferAttribute(vertices.length,3));
        const lipGeometry=new T.BufferGeometry(),lipPositions=new Float32Array((segments+1)*9*3),lipIndices=[];
        for(let a=0;a<segments;a++)for(let j=0;j<8;j++){const i=a*9+j;lipIndices.push(i,i+9,i+1,i+1,i+9,i+10);}
        lipGeometry.setAttribute('position',new T.BufferAttribute(lipPositions,3));lipGeometry.setIndex(lipIndices);mesh(torso,lipGeometry,purpleDark);
        const cavityMat=new T.MeshStandardMaterial({color:0x170319,roughness:1,side:T.DoubleSide});
        materials.push(cavityMat);
        // En indadgående skål frem for en sort kugle: tunge og tænder kan
        // fortsætte ind i munden uden at blive dækket af en konveks sort flade.
        const cavityGeometry=faceGeometry.clone();mesh(torso,cavityGeometry,cavityMat);
        // Mørk, mat mundfarve: scenens kraftige udfyldningslys når ellers også
        // ind i hulrummet og får den blanke lyserøde tunge til at virke belyst.
        const tongueMat=new T.MeshStandardMaterial({color:0x73213e,roughness:1,metalness:0,emissive:0x000000});materials.push(tongueMat);
        const tongue=ball(torso,tongueMat,0,-.53,.51,.255,.065,.32);
        const teeth=[];
        function incisorGeometry(){
            const shape=new T.Shape(),w=.072,h=.050,r=.012;
            shape.moveTo(-w+r,-h);shape.lineTo(w-r,-h);shape.quadraticCurveTo(w,-h,w,-h+r);
            shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);shape.lineTo(-w+r,h);
            shape.quadraticCurveTo(-w,h,-w,h-r);shape.lineTo(-w,-h+r);shape.quadraticCurveTo(-w,-h,-w+r,-h);
            const g=new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.009,bevelThickness:.009,curveSegments:6});g.translate(0,0,-.0175);return g;
        }
        for(const upper of [true,false])for(const sign of [-1,1]){
            const length=upper?.20:.12;
            const fang=mesh(torso,new T.ConeGeometry(.075,length,24),cream,sign*.43);
            fang.rotation.z=upper?Math.PI:0;fang.scale.z=.55;
            teeth.push({mesh:fang,upper,length,x:sign*.43,kind:'fang'});
            const incisorX=sign*(upper?.12:.25);
            const flat=mesh(torso,incisorGeometry(),cream,incisorX);
            teeth.push({mesh:flat,upper,length:.118,x:incisorX,kind:'incisor'});
        }
        // Store øjne og fysiske øjenlåg; iris falmer aldrig gennem et overlay.
        const eyes=[],gazes=[],brows=[];
        const irisMat=new T.MeshStandardMaterial({color:0x00bac9,roughness:.21,metalness:.12});materials.push(irisMat);
        for(const sign of [-1,1]){
            const eye=joint(torso,sign*.40,.43,.69,'eye');
            ball(eye,purpleDark,0,0,-.016,.345,.409,.175);
            ball(eye,white,0,0,0,.309,.372,.215);
            const gaze=joint(eye,0,0,0,'gaze');gazes.push(gaze);
            ball(gaze,irisMat,.04,-.035,.197,.158,.216,.055);
            ball(gaze,dark,.055,-.035,.24,.09,.149,.021);
            ball(gaze,white,.013,.06,.262,.048,.066,.017);
            ball(gaze,white,.105,-.106,.263,.019,.025,.012);
            const lid=mesh(eye,new T.SphereGeometry(1,32,16,0,TAU,0,Math.PI*.51),skin);
            lid.scale.set(.321,.387,.298);eyes.push(lid);
            const brow=ball(torso,skin,sign*.4,.76,.54,.30,.12,.15);brow.rotation.z=sign*-.13;brows.push(brow);
        }
        // Spidserne er buede og tilspidsede, så silhouetten genkender DEX.
        function tapered(parent,points,radius,material){
            const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),geo=new T.TubeGeometry(curve,26,1,10,false);
            const attr=geo.attributes.position;
            for(let i=0;i<=26;i++){const c=curve.getPointAt(i/26),r=radius*Math.pow(1-i/26,.75)+.002;for(let j=0;j<=10;j++){const k=i*11+j;attr.setXYZ(k,c.x+(attr.getX(k)-c.x)*r,c.y+(attr.getY(k)-c.y)*r,c.z+(attr.getZ(k)-c.z)*r);}}
            geo.computeVertexNormals();return mesh(parent,geo,material);
        }
        const quills=[];
        for(const [degrees,length,radius]of [[22,.85,.25],[48,.72,.22],[74,.57,.18]]){
            // Normalen til ellipsoiden, ikke samme lodrette retning for alle.
            // Roden sænkes lidt i huden, så der ikke opstår en synlig samling.
            const angle=degrees*Math.PI/180,y=1.08*Math.cos(angle),z=-.84*Math.sin(angle);
            const normal=surfaceNormal(0,y,z);
            const hinge=joint(torso,0,y-normal.y*.055,z-normal.z*.055,'quill');
            hinge.userData.restAngle=Math.atan2(normal.z,normal.y);
            tapered(hinge,[[0,0,0],[0,length*.35,0],[0,length*.75,0],[0,length,0]],radius,skin);
            quills.push(hinge);
        }
        const tailRoot=joint(torso,0,-.60,-.57,'tail');
        const tail=tapered(tailRoot,[[0,0,0],[0,-.10,-.4],[0,-.07,-.85],[0,.10,-1.35]],.17,skin);
        const tailBase=tail.geometry.attributes.position.array.slice();
        const arms=[];
        for(const sign of [-1,1]){
            const shoulder=joint(torso,sign*.88,-.04,.0,'shoulder');shoulder.rotation.z=sign*.22;
            ball(shoulder,skin,sign*.05,-.17,0,.145,.27,.15);
            const elbow=joint(shoulder,sign*.10,-.34,0,'elbow');
            ball(elbow,skin,0,-.14,0,.11,.20,.12);
            const hand=joint(elbow,0,-.30,0,'hand');ball(hand,cream,0,0,.025,.105,.117,.082);
            const fingers=[];
            for(let i=0;i<2;i++){const finger=ball(hand,cream,(i-.5)*.095,-.125,.045,.035,.100,.042);finger.name='finger';fingers.push(finger);}
            const thumb=ball(hand,cream,-sign*.107,-.007,.065,.038,.073,.043);thumb.rotation.z=-sign*.6;thumb.name='thumb';
            arms.push({shoulder,elbow,hand,fingers,thumb});
        }
        // Grej er selvstændige objekter på torsoens lokale monteringspunkter.
        const pump=joint(torso,-.47,-.43,.72,'belly-pump');pump.rotation.y=-.3;
        const shell=new T.MeshStandardMaterial({color:0xe6eff0,roughness:.3,metalness:.15});materials.push(shell);
        ball(pump,purpleDark,0,0,-.025,.195,.265,.095);ball(pump,shell,0,0,0,.177,.235,.09);
        ball(pump,teal,0,.045,.085,.115,.13,.018);ball(pump,teal,.035,-.13,.083,.04,.04,.018);
        tube(torso,[[-.43,-.65,.72],[-.34,-.79,.58],[-.64,-.73,.56],[-.71,-.46,.60]],.019,teal).name='pump-tube';
        const backpack=joint(torso,0,-.12,-.83,'backpack');
        const brass=new T.MeshStandardMaterial({color:0xb88a43,metalness:.72,roughness:.36});
        const iron=new T.MeshStandardMaterial({color:0x253b40,metalness:.65,roughness:.48});
        const copper=new T.MeshStandardMaterial({color:0x965239,metalness:.65,roughness:.42});
        materials.push(brass,iron,copper);
        ball(backpack,iron,0,0,.02,.33,.55,.15);
        // Tre fysiske cylindre på række bagud, ikke tre flade lys på rygpladen.
        // Afstanden i Z gør alle tre aflæselige fra begge sideprofiler.
        const tubes=[];
        for(let n=0;n<3;n++){
            const z=-.29-n*.34;
            const mat=new T.MeshStandardMaterial({color:0x1adfff,emissive:0x06bce0,emissiveIntensity:1,roughness:.19});materials.push(mat);
            const cell=mesh(backpack,new T.CylinderGeometry(.125,.125,.68,24),mat,0,.04,z);cell.name='insulin-cylinder';tubes.push(cell);
            for(const y of [-.34,.42]){
                mesh(backpack,new T.CylinderGeometry(.16,.16,.09,24),brass,0,y,z);
                const band=mesh(backpack,new T.TorusGeometry(.14,.017,8,24),iron,0,y+(y>0?-.065:.065),z);band.rotation.x=Math.PI/2;
            }
            for(const side of [-1,1]){
                mesh(backpack,new T.CylinderGeometry(.012,.012,.76,8),brass,side*.145,.04,z);
                for(const y of [-.34,.42])ball(backpack,copper,side*.163,y,z,.025,.025,.025);
            }
            tube(backpack,[[0,.47,z],[0,.56,z],[0,.57,.05]],.024,copper);
        }
        for(const side of [-1,1]){
            for(const y of [-.43,.53])tube(backpack,[[side*.20,y,.04],[side*.20,y,-.58],[side*.20,y,-1.04]],.032,iron);
            // Manometer og ventilhjul på begge sider; visuel mekanik uden doseringslogik.
            const gauge=joint(backpack,side*.25,.57,-.63,'pressure-gauge');gauge.rotation.y=side*Math.PI/2;
            mesh(gauge,new T.TorusGeometry(.12,.025,10,32),brass);
            mesh(gauge,new T.CircleGeometry(.105,32),cream,0,0,.006);
            for(let i=0;i<9;i++){const a=i/8*Math.PI*1.5-Math.PI*.25;ball(gauge,iron,Math.cos(a)*.083,Math.sin(a)*.083,.012,.008,.008,.008);}
            tube(gauge,[[0,0,.018],[-.045,.052,.018]],.008,copper);
            const wheel=mesh(backpack,new T.TorusGeometry(.09,.018,8,24),copper,side*.26,-.18,.0);wheel.rotation.y=Math.PI/2;
            for(let i=0;i<3;i++){const a=i*TAU/3;tube(backpack,[[side*.26,-.18,0],[side*.26,-.18+Math.cos(a)*.09,Math.sin(a)*.09]],.01,brass);}
        }
        for(const sign of [-1,1])tube(backpack,[[sign*.31,.52,0],[sign*.5,.6,.32],[sign*.71,.3,.52]],.032,purpleDark);
        const sensor=joint(torso,-.90,.19,.29,'cheek-cgm');sensor.rotation.y=-1.04;
        ball(sensor,shell,0,0,0,.17,.19,.07);
        // Unlit og uden tone mapping: scenens hvide lamper kan ikke udvaske LED'en.
        const lampMat=new T.MeshBasicMaterial({color:0x032310,toneMapped:false});materials.push(lampMat);
        const lamp=ball(sensor,lampMat,0,0,.069,.072,.080,.020);
        const lampOff=new T.Color(0x032310),lampOn=new T.Color();
        let currentTexture=null,skinName='';
        function setSkin(name,texture=null){
            if(currentTexture)currentTexture.dispose();skinName=name;
            if(!texture&&name!=='clay'){
                const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');
                g.fillStyle=name==='mint'?'#27a99c':'#9529bc';g.fillRect(0,0,1024,512);
                let seed=17;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
                for(let i=0;i<180;i++){const x=random()*1024,y=random()*512,r=3+random()*12;g.fillStyle=name==='mint'?'#228a88':'#78249c';for(const offset of [-1024,0,1024]){g.beginPath();g.ellipse(x+offset,y,r,r*.8,0,0,TAU);g.fill();}}
                texture=new T.CanvasTexture(c);
            }
            currentTexture=texture;skin.map=texture;skin.color.set(texture?0xffffff:0xb7a3be);
            if(texture){texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;texture.wrapS=T.RepeatWrapping;}
            purpleDark.color.set(name==='mint'?0x21646b:name==='clay'?0x716577:0x602178);skin.needsUpdate=true;
        }
        setSkin('purple');
        let lastMouth=-1;
        function mouthShape(open){
            if(Math.abs(lastMouth-open)<.001)return;lastMouth=open;
            const rx=.67+open*.08,ry=.025+open*.495,cy=-.31;
            const pos=faceGeometry.attributes.position;
            for(let r=0;r<=rings;r++)for(let a=0;a<=segments;a++){
                const angle=a/segments*TAU,u=Math.sin(r/rings*Math.PI/2),x=(rx*(1-u)+1.02*u)*Math.cos(angle),y=(cy+ry*Math.sin(angle))*(1-u)+1.08*Math.sin(angle)*u;
                const z=r===rings?0:.84*Math.sqrt(Math.max(0,1-(x/1.02)**2-(y/1.08)**2));const k=r*(segments+1)+a;
                pos.setXYZ(k,x,y,z);faceGeometry.attributes.uv.setXY(k,...surfaceUV(x,y,z));
                faceGeometry.attributes.normal.setXYZ(k,...surfaceNormal(x,y,z).toArray());
                const innerX=rx*Math.cos(angle),innerY=cy+ry*Math.sin(angle);
                const rimZ=.84*Math.sqrt(Math.max(0,1-(innerX/1.02)**2-(innerY/1.08)**2))-.015;
                cavityGeometry.attributes.position.setXYZ(k,innerX*(1-u),cy+(innerY-cy)*(1-u),rimZ+(.18-rimZ)*Math.sin(u*Math.PI/2));
            }
            pos.needsUpdate=true;faceGeometry.attributes.uv.needsUpdate=true;faceGeometry.attributes.normal.needsUpdate=true;
            cavityGeometry.attributes.position.needsUpdate=true;cavityGeometry.computeVertexNormals();
            for(let a=0;a<=segments;a++)for(let j=0;j<=8;j++){
                const angle=a/segments*TAU,q=j/8*TAU,x=rx*Math.cos(angle),y=cy+ry*Math.sin(angle),z=.84*Math.sqrt(Math.max(0,1-(x/1.02)**2-(y/1.08)**2));
                lipGeometry.attributes.position.setXYZ(a*9+j,x+.025*Math.cos(angle)*Math.cos(q),y+.025*Math.sin(angle)*Math.cos(q),z+.024*Math.sin(q));
            }
            lipGeometry.attributes.position.needsUpdate=true;lipGeometry.computeVertexNormals();
            tongue.position.y=cy-ry*.48;tongue.rotation.x=Math.atan2(ry*.55,.5);tongue.visible=open>.18;
            for(const tooth of teeth){
                const direction=tooth.upper?1:-1,edgeY=cy+direction*ry*Math.sqrt(1-(tooth.x/rx)**2);
                const visibleHeight=clamp(open*3,0,1);tooth.mesh.scale.y=visibleHeight;
                tooth.mesh.position.y=edgeY-direction*(tooth.length*.5-.02)*visibleHeight;
                tooth.mesh.position.z=.84*Math.sqrt(1-(tooth.x/1.02)**2-(edgeY/1.08)**2)-.095;
                tooth.mesh.visible=open>.025;
            }
        }
        function update(phase,options={}){
            const motion=options.motion||'idle',p=pose(motion,phase),beat=characterBeat(motion,p.t,options);
            const {inspect,curious,effort,breath}=beat;
            const droop=bgDroop(options.bg??6);
            quills.forEach(quill=>{quill.rotation.x=quill.userData.restAngle*(1-droop)-2.1*droop;});
            const automaticMouth=motion==='eat'?p.mouth:p.mouth*(1-Math.max(inspect,curious))+.08*inspect+.18*curious;
            const mouth=options.autoMouth===false?options.mouth:motion==='eat'?p.mouth:automaticMouth*(1-effort)+effort*(.16+.42*breath);
            mouthShape(clamp(mouth,0,1));group.position.y=p.lift-.18;group.position.x=.09*inspect;
            // Tungen hviler bag læben. Kun spisning rækker den lidt frem;
            // åben mund og tung vejrtrækning betyder ikke automatisk tunge ud.
            tongue.position.z=.32+(motion==='eat'?.19*p.reach:0);
            torso.rotation.x=p.lean+.23*inspect+.025*effort*(breath-.5);
            torso.rotation.y=clamp(options.lookYaw||0,-.65,.65)*curious;
            torso.rotation.z=-.10*inspect+.07*curious;
            torso.position.y=1.63+.035*effort*breath;
            torso.scale.set(1+.015*effort*breath,1+.025*effort*breath,1+.025*effort*breath);
            legs.forEach((leg,i)=>{leg.hip.rotation.x=(i===0?1:-1)*p.stride;leg.knee.rotation.x=-(i===0?p.knee:p.otherKnee);leg.foot.rotation.x=-(leg.hip.rotation.x+leg.knee.rotation.x)*.6;});
            legs[0].hip.rotation.x-=1.10*inspect;legs[0].knee.rotation.x+=.35*inspect;legs[0].foot.rotation.x-=.75*inspect;
            arms.forEach((arm,i)=>{
                const sign=i===0?-1:1;
                arm.shoulder.rotation.x=(motion==='run'?(i===0?1:-1):1)*p.arm-(i===0?.45:0)*inspect;
                arm.shoulder.rotation.z=sign*(.22+.48*curious+.04*effort*breath)+(i===0?.6:0)*inspect;
                arm.elbow.rotation.x=-.3-p.reach*.7-.3*curious;
                arm.hand.rotation.x=-.5*curious;arm.hand.rotation.z=sign*.32*curious;
            });
            gazes.forEach(gaze=>{gaze.rotation.x=.48*inspect;gaze.rotation.y=-.22*inspect+clamp((options.lookYaw||0)-torso.rotation.y,-.3,.3)*curious;});
            brows.forEach((brow,i)=>{const sign=i===0?-1:1;brow.position.y=.76+(i===0?.11:-.035)*curious;brow.rotation.z=-sign*.13-sign*.09*inspect;});
            const closure=options.expression==='sleepy'?.69:options.expression==='grumpy'?.43:.04+.13*inspect+.06*curious+.05*effort;
            const blink=Math.exp(-Math.pow((p.t-.90)/.035,2));
            // Låget vokser ned langs øjets kugleflade, ikke som en klap over hovedet.
            eyes.forEach(lid=>{
                const close=closure+(1-closure)*blink,positions=lid.geometry.attributes.position;
                for(let row=0;row<=16;row++)for(let col=0;col<=32;col++){
                    const theta=row/16*Math.PI*close,phi=col/32*TAU;
                    positions.setXYZ(row*33+col,-Math.cos(phi)*Math.sin(theta),Math.cos(theta),Math.sin(phi)*Math.sin(theta));
                }
                positions.needsUpdate=true;lid.geometry.computeVertexNormals();
            });
            const attr=tail.geometry.attributes.position;
            // Bevar rod og bevægelse, men lad spidsen synke mod underlaget.
            // Gulvkontakten beregnes i verdenskoordinater, også når kroppen læner.
            group.updateMatrixWorld(true);
            const tailWorld=new T.Vector3(),tailInverse=tail.matrixWorld.clone().invert();
            for(let i=0;i<attr.count;i++){
                const x=tailBase[i*3],y=tailBase[i*3+1],z=tailBase[i*3+2],weight=clamp(-z/1.35,0,1);
                tailWorld.set(x+Math.sin(p.t*TAU-weight*2.5)*weight*weight*.22*(1-.65*droop),y-1.25*droop*weight*weight,z).applyMatrix4(tail.matrixWorld);
                tailWorld.y=Math.max(.025,tailWorld.y);
                tailWorld.applyMatrix4(tailInverse);attr.setXYZ(i,tailWorld.x,tailWorld.y,tailWorld.z);
            }
            attr.needsUpdate=true;tail.geometry.computeVertexNormals();
            pump.visible=options.gear==='pump';torso.getObjectByName('pump-tube').visible=pump.visible;
            backpack.visible=options.gear==='backpack';sensor.visible=options.cgm!==false;
            tubes.forEach((m,i)=>{m.material.emissiveIntensity=i<(options.stock??3)?1.25:0;m.material.color.set(i<(options.stock??3)?0x32deff:0x163244);});
            const mode=options.lamp||'green',pulse=mode==='off'?0:mode==='orange'?Math.max(Math.exp(-Math.pow((p.t-.15)/.07,2)),Math.exp(-Math.pow((p.t-.36)/.07,2))):Math.max(0,Math.sin(p.t*TAU*(mode==='red'?3:1)))**8;
            lampOn.set(mode==='red'?0xe82746:mode==='orange'?0xed8a13:0x10cb3d);
            lampMat.color.copy(lampOff).lerp(lampOn,pulse);
            const rough=options.finish==='gloss'?.19:options.finish==='matte'?.82:.42;skin.roughness=rough;
            for(const mat of materials)mat.wireframe=Boolean(options.wire);
            return {...p,...beat,droop};
        }
        update(0);
        return {group,update,setSkin,pose,skin,materials,legs,arms,gazes,quills,tail,torso,faceGeometry,backGeometry,backpack,sensor,teeth,tongue,lamp,get skinName(){return skinName;}};
    }
    const api={pose,create,activityState,advanceActivity,bgDroop};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Dex3D=api;
})(globalThis);
