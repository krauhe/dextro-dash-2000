/* Kompakt 3D-glas og insulinbetjent skydeventil. Kun read-only illustration:
 * partikelantal er kvalitativt; fysiologi og gameplay ændres ikke.
 * Rør, åbning og partikelbaner bruger fælles koordinater.
 */
(function(root){
    'use strict';
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    // Hvert dryp åbner spjældet kort og tydeligt. Dråberne er en visuel metafor,
    // ikke et insulinenheds-forbrug eller en matematisk glukosekvote.
    // Samme afrundingsgrænse som IOB-labelen: vist 0.0 giver ingen dryp.
    function createValveDrive(){
        let credit=0,pulseAge=10,flash=0,impacts=0;
        const drops=[];
        return {
            update(iob,seconds){
                const supplied=Number.isFinite(iob)&&iob>=.05;
                if(!supplied){credit=0;drops.length=0;}
                let remaining=clamp(seconds,0,.1);
                while(remaining>1e-9){
                    const dt=Math.min(remaining,1/120);remaining-=dt;
                    pulseAge+=dt;flash*=Math.exp(-dt*7);
                    credit+=supplied?dt*clamp(iob*.8,.35,1.4):0;
                    while(credit>=1){drops.push({age:0});credit--;}
                    for(let i=drops.length-1;i>=0;i--){
                        drops[i].age+=dt;
                        if(drops[i].age>=.65){
                            pulseAge=0;flash=1;impacts++;drops.splice(i,1);
                        }
                    }
                }
                const openness=pulseAge<.07?pulseAge/.07:pulseAge<.30?1:Math.max(0,1-(pulseAge-.30)/.20);
                return {gap:1.4*openness,flash,impacts,drops:drops.map(d=>d.age/.65)};
            },
            reset(){credit=flash=impacts=0;pulseAge=10;drops.length=0;}
        };
    }
    // Dæmpet overfladebevægelse, ikke en ekstra fysiologisk simulering.
    // Bølgernes middelværdi er nul, så den viste middelhøjde ikke ændres.
    function createSlosh(){
        let previous=null,energy=0,phase=0,depth=0;
        return {
            update(height,dt){
                dt=clamp(dt,0,.1);depth=height;
                energy*=Math.exp(-dt*1.8);
                if(previous!==null)energy=Math.min(1.1,energy+Math.abs(height-previous)*.8);
                previous=height;phase+=dt*4.2;
            },
            sample(u){
                const amplitude=Math.min(depth*.24,.08+energy);
                return amplitude*(Math.sin(u*Math.PI*2)*Math.cos(phase)
                    +.35*Math.sin(u*Math.PI*4)*Math.sin(phase*.73));
            },
            reset(){previous=null;energy=0;phase=0;depth=0;}
        };
    }
    function create(){
        if(!root.THREE)return null;
        const T=root.THREE,canvas=document.createElement('canvas');let renderer;
        try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});}catch(_){return null;}
        renderer.setSize(1140,186,false);renderer.setClearColor(0,0);
        renderer.outputColorSpace=T.SRGBColorSpace;
        renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
        const scene=new T.Scene(),camera=new T.OrthographicCamera(0,190,31,0,.1,400);
        camera.position.set(0,0,150);camera.lookAt(0,0,0);
        // Fælles perspektiv holder rør og partikler præcist sammen.
        scene.rotation.x=.14;
        scene.add(new T.HemisphereLight(0xcceeff,0x11162d,2));
        for(const [x,y,z,color,power] of [[-30,60,70,0xffffff,3],[160,25,20,0x42dfff,2]]){
            const light=new T.DirectionalLight(color,power);light.position.set(x,y,z);scene.add(light);
        }
        const metal=new T.MeshStandardMaterial({color:0x6d8598,metalness:.65,roughness:.24});
        const glass=new T.MeshPhysicalMaterial({color:0x83bdd6,transparent:true,opacity:.13,
            depthWrite:false,roughness:.12,metalness:.1,clearcoat:1,side:T.DoubleSide});
        // Svagt gyldent, gennemsigtigt fyld giver de gyldne partikler kontrast.
        // Et lyst, opakt fyld fik dem tidligere til at forsvinde i BG/COB.
        const yellow=new T.MeshStandardMaterial({color:0xffc943,emissive:0xba6500,
            emissiveIntensity:.2,roughness:.23,transparent:true,opacity:.17,depthWrite:false});
        const blue=new T.MeshStandardMaterial({color:0x14bfe9,emissive:0x0095c4,emissiveIntensity:.25,roughness:.2});
        function box(x,y,w,h,d,material,z=0){
            const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);scene.add(m);return m;
        }
        function rounded(x,y,w,h,d,material){
            const shape=new T.Shape(),r=Math.min(1.3,h/3),a=-w/2,b=-h/2;
            shape.moveTo(a+r,b);shape.lineTo(a+w-r,b);shape.quadraticCurveTo(a+w,b,a+w,b+r);
            shape.lineTo(a+w,b+h-r);shape.quadraticCurveTo(a+w,b+h,a+w-r,b+h);
            shape.lineTo(a+r,b+h);shape.quadraticCurveTo(a,b+h,a,b+h-r);
            shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);
            const m=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:.22,bevelThickness:.22,bevelSegments:3,steps:1}),material);
            m.position.set(x,y,-d/2);scene.add(m);return m;
        }
        function reservoir(x,bottom,w,h){
            rounded(x,bottom+h/2,w,h,4,glass);
            rounded(x,bottom,w+1,1.1,5,metal);rounded(x,bottom+h,w+1,1.1,5,metal);
            // Spejlinger viser glassets kanter uden at dække væsken.
            const shine=new T.MeshBasicMaterial({color:0xd9f7ff,transparent:true,opacity:.55,depthWrite:false});
            box(x-w/2+1,bottom+h/2,.35,h-2,.1,shine,2.5);
            box(x+w/2-.6,bottom+h/2,.18,h-1,.1,shine,2.5);
        }
        reservoir(18,2,25,20);reservoir(81,2,72,20);reservoir(140,13,27,9);
        // Glukose beholder sin gule farve. BG-status bæres af glassets tykke
        // ramme, ikke af væsken, så stoffet ikke skifter identitet undervejs.
        const statusMaterial=new T.MeshStandardMaterial({color:0x26c67d,
            emissive:0x26c67d,emissiveIntensity:.25,roughness:.3,metalness:.2});
        box(45,12,1.8,21,5,statusMaterial);
        // Højre ramme må ikke ligne en ekstra ventil hen over rørmundingen.
        box(117,14.15,1.8,16.7,5,statusMaterial);
        for(const y of [2,22])box(81,y,73.8,1.6,5,statusMaterial);
        function liquid(x,bottom,width,material,shine){
            // Delte topsegmenter deformerer både front og bagside af væsken.
            const geometry=new T.BoxGeometry(width,1,3,32,1,1);
            const positions=geometry.attributes.position;
            const original=Float32Array.from(positions.array),slosh=createSlosh();
            const mesh=new T.Mesh(geometry,material);mesh.position.set(x,bottom,0);scene.add(mesh);
            const lineGeometry=new T.BufferGeometry();
            const linePoints=new Float32Array(33*3);
            lineGeometry.setAttribute('position',new T.BufferAttribute(linePoints,3));
            const line=new T.Line(lineGeometry,new T.LineBasicMaterial({color:shine}));
            line.position.copy(mesh.position);scene.add(line);
            return {reset:()=>slosh.reset(),update(height,dt){
                slosh.update(height,dt);
                for(let i=0;i<positions.count;i++){
                    const u=original[i*3]/width+.5;
                    positions.setY(i,original[i*3+1]>.0?height+slosh.sample(u):0);
                }
                positions.needsUpdate=true;geometry.computeVertexNormals();
                for(let i=0;i<=32;i++){
                    linePoints[i*3]=(i/32-.5)*width;
                    linePoints[i*3+1]=height+slosh.sample(i/32);
                    linePoints[i*3+2]=1.55;
                }
                lineGeometry.attributes.position.needsUpdate=true;
                // Den oprindelige 1-pixel-geometri må ikke give forkert frustum-culling.
                mesh.frustumCulled=false;line.frustumCulled=false;
            }};
        }
        const food=liquid(18,2.8,22,yellow,0xffedaf);
        const insulin=liquid(140,13.8,24,blue,0x9feeff);
        const water=liquid(81,2.8,69,yellow,0xffedaf);
        function pipe(x,w,y,h){
            rounded(x,y,w,h,4,glass);
            box(x,y-h/2,w,.45,4,metal);box(x,y+h/2,w,.45,4,metal);
        }
        // Begge glukoserør har samme diameter og bund i niveau med glasset.
        pipe(38,16,3.8,3.6);pipe(143,52,3.8,3.6);
        const pipeLiquidMaterial=yellow.clone();
        pipeLiquidMaterial.transparent=true;pipeLiquidMaterial.opacity=.3;
        pipeLiquidMaterial.depthWrite=false;
        const foodPipeLiquid=box(38,2.8,16,1,3,pipeLiquidMaterial);
        // BG-væsken fylder kun frem til ventilens venstre kontaktflade (138.6).
        // Efter ventilen vises de frigivne partikler, ikke en permanent væskesøjle
        // med tankens niveau: den ville se ud til at passere et lukket spjæld.
        const glucosePipeLiquid=box((117+138.6)/2,2.8,138.6-117,1,3,pipeLiquidMaterial);
        // Gennemsigtigt signalrør: dråberne kan følges helt ned til stemplet.
        rounded(140,9.4,2.2,6.8,3,glass);
        const actuatorMaterial=blue.clone();
        const upper=rounded(140,4.92,2.6,1.8,4.5,metal);
        const lower=rounded(140,2.68,2.6,1.8,4.5,metal);
        const actuator=box(140,5.9,4,.7,4.6,actuatorMaterial);
        const chamber=root.DexHUDChamber.create({count:720});
        const foodChamber=root.DexHUDChamber.createFood();
        // Samme gyldne sekskant og bløde halo som muskelstøvet. Teksturen
        // bages én gang; ingen fuldskærms-bloom eller ekstra fysiologisk effekt.
        const glucoseTexture=new T.CanvasTexture(root.DexGlucoseParticles.createTexture());
        glucoseTexture.colorSpace=T.SRGBColorSpace;
        const glucoseGeometry=new T.PlaneGeometry(1.65,1.65);
        const glucoseMaterial=new T.MeshBasicMaterial({map:glucoseTexture,
            transparent:true,opacity:.85,depthWrite:false,toneMapped:false});
        // Én GPU-tegning for alle 720 glukosepartikler, ikke 720 draw calls.
        const cloud=new T.InstancedMesh(glucoseGeometry,glucoseMaterial,720);
        cloud.instanceMatrix.setUsage(T.DynamicDrawUsage);cloud.frustumCulled=false;scene.add(cloud);
        const foodCloud=new T.InstancedMesh(glucoseGeometry,glucoseMaterial,150);
        foodCloud.instanceMatrix.setUsage(T.DynamicDrawUsage);foodCloud.frustumCulled=false;scene.add(foodCloud);
        const instance=new T.Object3D();
        function placeCloud(mesh,motes){
            mesh.count=motes.length;
            motes.forEach((p,i)=>{
                instance.position.set(p.x,p.y,2.1);instance.rotation.z=p.angle;
                instance.scale.setScalar(p.radius/.16);instance.updateMatrix();mesh.setMatrixAt(i,instance.matrix);
            });
            mesh.instanceMatrix.needsUpdate=true;
        }
        const foodParticles=Array.from({length:12},()=>{const p=new T.Mesh(glucoseGeometry,glucoseMaterial);scene.add(p);return p;});
        const insulinTexture=new T.CanvasTexture(root.DexGlucoseParticles.createInsulinTexture());
        insulinTexture.colorSpace=T.SRGBColorSpace;
        const insulinGlyphMaterial=new T.MeshBasicMaterial({map:insulinTexture,transparent:true,depthWrite:false,toneMapped:false});
        const insulinParticles=Array.from({length:18},(_,i)=>{
            const p=new T.Mesh(new T.PlaneGeometry(i<10?1.5:2.5,i<10?1.5:2.5),insulinGlyphMaterial);scene.add(p);return p;
        });
        const valveDrive=createValveDrive();
        let available=true,lastTime=-1,lastValues='';
        canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();available=false;});
        function draw(ctx,x,y,s){
            if(!available)return false;
            const values=[s.bg,s.cob,s.iob,s.action,s.food,s.out].join(':');
            if(values!==lastValues||Math.abs(s.time-lastTime)>1/30){
                const dt=lastTime<0?0:clamp(s.time-lastTime,0,.1);
                lastValues=values;lastTime=s.time;
                const height=clamp((s.bg-2.8)/16.2,.045,1)*17;
                water.update(height,dt);
                const statusColor=s.bg<4?0xff4d71:s.bg>10?0xf7a839:0x26c67d;
                statusMaterial.color.setHex(statusColor);statusMaterial.emissive.setHex(statusColor);
                const warning=s.bg<4||s.bg>10;
                const pulse=.5+.5*Math.sin(s.time*(s.bg<4?8:3.5));
                statusMaterial.emissiveIntensity=warning?.15+.65*pulse:.25;
                const fh=clamp(s.cob/40*14,.04,14),ih=clamp(s.iob/3*4,.04,4);
                food.update(fh,dt);insulin.update(ih,dt);
                // Samme synlige væskeniveau i beholder og tilsluttet rør.
                // Partikelkerner holdes i væsken; gløden må brede sig svagt i glasset.
                const pipeDepth=Math.min(2.1,height),foodPipeDepth=Math.min(2.1,fh);
                glucosePipeLiquid.scale.y=pipeDepth;glucosePipeLiquid.position.y=2.8+pipeDepth/2;
                foodPipeLiquid.scale.y=foodPipeDepth;foodPipeLiquid.position.y=2.8+foodPipeDepth/2;
                foodPipeLiquid.visible=s.cob>=.5;
                const valve=valveDrive.update(s.iob,dt),gap=valve.gap;
                upper.position.y=3.8+gap+1.12;lower.position.y=3.8-gap-1.12;
                actuatorMaterial.emissiveIntensity=.2+valve.flash*1.6;
                actuator.scale.y=1+valve.flash*.3;
                const exitRate=s.iob>=.05?root.DexGlucoseParticles.flowRate(s.extraDisposal):0;
                placeCloud(cloud,chamber.update({height,gap,exitRate},dt));
                placeCloud(foodCloud,foodChamber.update(s.cob,dt));
                foodParticles.forEach((p,i)=>{
                    const f=(s.time*.7+i*.137)%1;
                    p.visible=s.cob>=.5&&foodPipeDepth>.8&&s.food>.00001&&i<clamp(s.food*4+2,0,12);
                    p.position.set(30+f*16,2.8+foodPipeDepth/2+Math.sin(i*7)*Math.max(0,foodPipeDepth/2-.45),1);
                });
                insulinParticles.forEach((p,i)=>{
                    const link=i>=10,f=valve.drops[i-10];
                    p.visible=link?f!==undefined:s.iob>=.05&&i<Math.ceil(clamp(s.iob*4,0,10));
                    p.position.set(link?140:130+(i*3.17)%20,
                        link?12.5-(f??0)*6.3:14.2+Math.max(.2,ih-.5)*(.5+.4*Math.sin(s.time+i)),2.1);
                });
                renderer.render(scene,camera);
            }
            ctx.drawImage(canvas,x,y,190,31);return true;
        }
        function reset(){
            lastTime=-1;lastValues='';chamber.reset();
            foodChamber.reset();
            valveDrive.reset();
            food.reset();insulin.reset();water.reset();
        }
        return {draw,reset};
    }
    root.DexBGHUD={create,createSlosh,createValveDrive};
})(globalThis);
