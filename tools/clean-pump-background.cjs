// Fjerner det indtegnede skakmønster; metaldele bevares bag mørke konturer.
const sharp=require('sharp'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const {data,info}=await sharp(path.join(root,'assets/insulin-pump-auto.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info,seen=new Uint8Array(w*h),queue=[];
 function add(x,y){if(x<0||y<0||x>=w||y>=h)return;const p=y*w+x,i=p*4;
 if(seen[p])return;const lo=Math.min(data[i],data[i+1],data[i+2]),hi=Math.max(data[i],data[i+1],data[i+2]);
 if(lo<215||hi-lo>22)return;seen[p]=1;queue.push(p);}
 for(let x=0;x<w;x++){add(x,0);add(x,h-1);}for(let y=0;y<h;y++){add(0,y);add(w-1,y);}
 // De tre lukkede baggrundshuller mellem remmene og slangen.
 for(const [x,y] of [[.71,.39],[.69,.63],[.49,.80]])add(Math.floor(x*w),Math.floor(y*h));
 for(let n=0;n<queue.length;n++){const p=queue[n],x=p%w,y=Math.floor(p/w);data[p*4+3]=0;add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);}
 await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toFile(path.join(root,'assets/insulin-pump-auto-clean.png'));
 await sharp(data,{raw:{width:w,height:h,channels:4}}).flatten({background:'#171329'}).resize(620).png().toFile(path.join(root,'tests/pump-clean-preview.png'));
 console.log('Transparent background pixels:',queue.length);
})();
