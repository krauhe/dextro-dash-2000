/* Fjern lys neutral genereret baggrund, men bevar mørke sten og massiv jord. */
const sharp=require('sharp');
(async()=>{
 const {data,info}=await sharp(process.argv[2]).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const output=Buffer.alloc(info.width*info.height*4);
 for(let i=0;i<info.width*info.height;i++){
  const r=data[i*3],g=data[i*3+1],b=data[i*3+2],low=Math.min(r,g,b),high=Math.max(r,g,b);
  const y=Math.floor(i/info.width);
  let alpha=1;
  if(y<info.height*.82&&low>110)alpha=Math.max(0,Math.min(1,(high-low-12)/42));
  for(let c=0;c<3;c++)output[i*4+c]=alpha>0&&alpha<1
   ?Math.max(0,Math.min(255,(data[i*3+c]-240*(1-alpha))/alpha)):data[i*3+c];
  output[i*4+3]=Math.round(alpha*255);
 }
 await sharp(output,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile(process.argv[3]);
 await sharp(output,{raw:{width:info.width,height:info.height,channels:4}}).flatten({background:'#302344'}).png().toFile(process.argv[4]);
 console.log(JSON.stringify({width:info.width,height:info.height}));
})();
