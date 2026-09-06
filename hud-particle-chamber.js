/* Visuel partikelbeholder til BG-panelet. Små kugler bevæger sig tilfældigt,
 * støder mod naboer/vægge og slipper kun gennem den synlige ventilåbning.
 * Ingen kø eller baner. Udløbsbudgettet følger den fælles visuelle målestok.
 * Dette ændrer aldrig fysiologimodellen.
 * Egen tilfældighed holder animationsstøj adskilt fra spillets belønninger. */
(function(root){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 // Fælles bevægelse i begge beholdere. Støj har ingen foretrukken retning
 // og kender intet til insulin eller ventilens tilstand.
 function jostle(p,random,dt){
  const noise=Math.sqrt(dt)*96;
  p.vx=p.vx*Math.exp(-dt*1.3)+(random()-.5)*noise;
  p.vy=p.vy*Math.exp(-dt*1.3)+(random()-.5)*noise;
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=dt*(p.vx*.025+.6);
 }
 // Rumligt gitter: lokale kontakter, ikke N² sammenligninger pr. billede.
 function contacts(motes){
  const cells=new Map(),cellSize=.55;let hits=0;
  for(let i=0;i<motes.length;i++){
   const p=motes[i];if(p.state!=='tank')continue;
   const cx=Math.floor(p.x/cellSize),cy=Math.floor(p.y/cellSize);
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    const nearby=cells.get((cx+dx)+':'+(cy+dy));if(!nearby)continue;
    for(const j of nearby){
     const q=motes[j],vx=p.x-q.x,vy=p.y-q.y,d2=vx*vx+vy*vy,limit=p.radius+q.radius;
     if(d2>=limit*limit||d2<1e-10)continue;
     const d=Math.sqrt(d2),nx=vx/d,ny=vy/d,push=(limit-d)*.5;
     p.x+=nx*push;p.y+=ny*push;q.x-=nx*push;q.y-=ny*push;
     const approach=(p.vx-q.vx)*nx+(p.vy-q.vy)*ny;
     if(approach<0){p.vx-=approach*nx;p.vy-=approach*ny;q.vx+=approach*nx;q.vy+=approach*ny;}
     hits++;
    }
   }
   const key=cx+':'+cy;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);
  }
  return hits;
 }
 function create({count=720,seed=29000}={}){
  let rng=seed>>>0,ready=false,escaped=0,collisions=0,exitCredit=0,metered=false;
  const motes=[];
  const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  function spawn(p,height,inPipe=false){
   p.radius=.12+random()*.075;
   p.x=inPipe?117+random()*20.7:47.3+random()*69;
   const top=2.8+(inPipe?Math.min(2.1,height):height);
   p.y=2.8+p.radius+random()*Math.max(.01,top-2.8-2*p.radius);
   p.vx=(random()-.5)*15;p.vy=(random()-.5)*13;
   p.state='tank';p.angle=random()*Math.PI*2;
  }
  function walls(p,height,gap,oldX){
   const r=p.radius,pipeTop=2.8+Math.min(2.1,height),tankTop=2.8+height;
   // Den lodrette kant over rørets munding er massiv; under den er tank og
   // indløbsrør ét sammenhængende rum. Ingen usynlig ventil ved tankudgangen.
   if(p.x>=117 && p.y+r>pipeTop && oldX<117){p.x=117-r;p.vx=-Math.abs(p.vx);}
   const top=p.x>=117?pipeTop:tankTop;
   if(p.y-r<2.8){p.y=2.8+r;p.vy=Math.abs(p.vy);}
   if(p.y+r>top){p.y=Math.max(2.8+r,top-r);p.vy=-Math.abs(p.vy);}
   if(p.x-r<47){p.x=47+r;p.vx=Math.abs(p.vx);}
   const fits=gap>r&&p.y-r>=3.8-gap&&p.y+r<=3.8+gap&&(!metered||exitCredit>=1);
   if(p.x+r>=138.6&&!fits){p.x=138.6-r;p.vx=-Math.abs(p.vx);}
   // Partikler skal fysisk gennem hele åbningen; metal må ikke teleporteres
   // igennem ved et dryp. Først på ydersiden skifter de til udløbsrøret.
   if(p.x>142){p.state='out';escaped++;if(metered)exitCredit-=1;}
  }
  return {
   update({height,gap,exitRate},seconds){
    metered=Number.isFinite(exitRate);
    if(metered){if(exitRate<=0)exitCredit=0;else exitCredit+=exitRate*clamp(seconds,0,.1);}
    height=clamp(Number.isFinite(height)?height:1,.75,17);
    gap=clamp(Number.isFinite(gap)?gap:0,0,1.4);
    if(!ready){for(let i=0;i<count;i++){const p={};spawn(p,height,i<count*.28);motes.push(p);}ready=true;}
    // Kun væggens åbning ændres. Et insulindryp ændrer aldrig hastighederne
    // eller skubber skyen mod højre; de lokale tilfældige bevægelser fortsætter.
    let remaining=clamp(seconds,0,.1);
    while(remaining>1e-9){
     const dt=Math.min(remaining,1/120);remaining-=dt;
     for(const p of motes){
      const oldX=p.x;
      if(p.state==='out'){
       p.vx+=(68-p.vx)*dt*3;p.x+=p.vx*dt;
       if(p.x<169){
        p.y+=p.vy*dt;
        if(p.y-p.radius<2.8){p.y=2.8+p.radius;p.vy=Math.abs(p.vy)*.6;}
        if(p.y+p.radius>4.9){p.y=4.9-p.radius;p.vy=-Math.abs(p.vy)*.6;}
       }else{p.vy-=dt*95;p.y+=p.vy*dt;}
       if(p.y < -9 || p.x>192)spawn(p,height,random()<.28);
       continue;
      }
      jostle(p,random,dt);walls(p,height,gap,oldX);
     }
     collisions+=contacts(motes);
     for(const p of motes)if(p.state==='tank')walls(p,height,gap,p.x);
    }
    return motes;
   },
   reset(){rng=seed>>>0;ready=false;escaped=collisions=exitCredit=0;motes.length=0;},
   get particles(){return motes;},
   get stats(){return {count:motes.length,escaped,collisions};}
  };
 }
 // COB får samme partikler og bevægelse, men kun når den viste beholdning
 // er positiv. Antallet følger fyldningen; det er ikke molekyletælling.
 function createFood(){
  let rng=30001;const motes=[];
  const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  function bounds(p,height){
   const r=p.radius;
   if(p.x-r<7){p.x=7+r;p.vx=Math.abs(p.vx);}
   if(p.x+r>29){p.x=29-r;p.vx=-Math.abs(p.vx);}
   if(p.y-r<2.8){p.y=2.8+r;p.vy=Math.abs(p.vy);}
   if(p.y+r>2.8+height){p.y=2.8+height-r;p.vy=-Math.abs(p.vy);}
  }
  return {
   update(cob,seconds){
    cob=Number.isFinite(cob)?Math.max(0,cob):0;
    const count=cob>=.5?Math.ceil(clamp(cob/40,0,1)*150):0;
    const height=clamp(cob/40*14,.04,14),radius=Math.min(.16,height*.22);
    while(motes.length<count)motes.push({x:7+radius+random()*(22-2*radius),
     y:2.8+radius+random()*(height-2*radius),radius,
     vx:(random()-.5)*15,vy:(random()-.5)*13,state:'tank',angle:random()*Math.PI*2});
    motes.length=count;
    for(const p of motes){p.radius=radius;bounds(p,height);}
    let remaining=clamp(seconds,0,.1);
    while(remaining>1e-9){
     const dt=Math.min(remaining,1/120);remaining-=dt;
     for(const p of motes){jostle(p,random,dt);bounds(p,height);}
     contacts(motes);for(const p of motes)bounds(p,height);
    }
    return motes;
   },
   reset(){motes.length=0;rng=30001;},
   get particles(){return motes;}
  };
 }
 root.DexHUDChamber={create,createFood};
})(globalThis);
