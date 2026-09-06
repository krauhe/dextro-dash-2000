/* Fælles glukose-grafik til HUD og DEX' muskelstøv. Kun visning:
 * raten læses fra modellen, men der trækkes aldrig glukose fra her.
 * Eget deterministisk mønster påvirker ikke spillets tilfældige belønninger. */
(function(root){
    'use strict';
    // Fælles visuel målestok: begge inputrater er mmol/min fra motoren.
    function flowRate(uptake){return Math.max(0,Number.isFinite(uptake)?uptake:0)*4;}
    function drawGlyph(ctx,x,y,r,alpha=1,rotation=0){
        ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=alpha;
        const glow=ctx.createRadialGradient(0,0,r*.3,0,0,r*3.2);
        glow.addColorStop(0,'rgba(255,205,64,.6)');
        glow.addColorStop(.35,'rgba(255,193,36,.22)');
        glow.addColorStop(1,'rgba(255,180,25,0)');
        ctx.fillStyle=glow;ctx.fillRect(-r*3.2,-r*3.2,r*6.4,r*6.4);
        ctx.fillStyle='#ffc943';ctx.beginPath();
        for(let i=0;i<6;i++){
            const a=i*Math.PI/3,px=Math.cos(a)*r,py=Math.sin(a)*r;
            if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.closePath();ctx.fill();
        ctx.fillStyle='#ffe99a';ctx.beginPath();ctx.arc(-r*.25,-r*.25,r*.25,0,Math.PI*2);ctx.fill();
        ctx.restore();
    }
    function createTexture(){
        const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
        drawGlyph(canvas.getContext('2d'),32,32,9.5);
        return canvas;
    }
    // Samme turkise dråbe bruges ved DEX og mellem IOB og ventilen.
    function drawInsulinGlyph(ctx,x,y,r,alpha=1){
        ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;
        const glow=ctx.createRadialGradient(0,0,0,0,0,r*3);
        glow.addColorStop(0,'rgba(20,191,233,.9)');glow.addColorStop(.35,'rgba(20,191,233,.4)');glow.addColorStop(1,'rgba(20,191,233,0)');
        ctx.fillStyle=glow;ctx.fillRect(-r*3,-r*3,r*6,r*6);
        ctx.fillStyle='#14bfe9';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#93f3ff';ctx.beginPath();ctx.arc(-r*.25,-r*.25,r*.25,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    function createInsulinTexture(){
        const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
        drawInsulinGlyph(canvas.getContext('2d'),32,32,9.5);return canvas;
    }
    function createDust(){
        let motes=[],credit=0,serial=0;
        const hash=n=>{const v=Math.sin(n*127.1+3.7)*43758.5453;return v-Math.floor(v);};
        return {
            update(dt,uptake,pose){
                if(!(dt>0))return;
                dt=Math.min(dt,.1);
                // beta*E1 er mmol/min. Samme lineære skala som ventiludløbet;
                // en separat mætning her ville forvrænge forholdet mellem dem.
                const rate=flowRate(uptake);
                credit+=rate*dt;
                while(credit>=1){
                    credit--;const n=serial++;
                    motes.push({age:0,side:n%2?1:-1,rotation:hash(n+4)*6,
                        x:pose.x+(hash(n)*2-1)*11,y:pose.y-3-hash(n+1)*7,
                        drift:(hash(n+2)-.5)*10,vy:-5,size:.5+hash(n+3)*.22});
                }
                for(const m of motes){
                    m.age+=dt;
                    if(m.age<.25){
                        const blend=1-Math.exp(-dt*12);
                        m.x+=(pose.x+m.side*2-m.x)*blend;m.y+=(pose.y-2-m.y)*blend;
                    }else{
                        // Efter et kort svæv slipper glimmeret DEX og falder
                        // frit, også gennem HUD-området, helt ud af billedet.
                        m.vy+=65*dt;
                        m.x+=m.drift*dt;m.y+=m.vy*dt;
                    }
                }
                motes=motes.filter(m=>m.y<(pose.screenBottom??200)+8&&m.age<8);
            },
            draw(ctx){
                for(const m of motes){
                    const alpha=Math.min(.85,m.age/.1);
                    drawGlyph(ctx,m.x,m.y,m.size,alpha,m.rotation+m.age);
                }
            },
            reset(){motes=[];credit=0;serial=0;},
            get count(){return motes.length;}
        };
    }
    root.DexGlucoseParticles={flowRate,drawGlyph,createTexture,createDust,drawInsulinGlyph,createInsulinTexture};
})(globalThis);
