/* Temaernes ekstra mellemlag. Alt er fastgjort til en sammenhængende bund,
 * og bevæger sig langsommere end banen, hurtigere end den fjerne baggrund.
 * Deterministiske verdenskoordinater undgår flimren og skift ved tilbageløb.
 * Ren tegning: ingen forhindringer, hitboxes eller tilfældighed i gameplay.
 */
(function(root){
    'use strict';
    const palettes={
        cellar:['#302c3c','#524454','#796074'],
        cave:['#222a44','#354563','#6684a6'],
        mountain:['#344b59','#536c77','#9aadb2'],
        volcano:['#30232d','#50303b','#925147'],
        ice:['#224f72','#3b809f','#89c8dc'],
        factory:['#243e49','#385867','#6f8790'],
        citadel:['#34223f','#52335e','#97649a'],
    };
    const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
    function drawMiddle(ctx,{width,bottom,camera,theme}){
        const colors=palettes[theme];if(!colors)return;
        const offset=camera*.13,first=Math.floor(offset/32)-1,last=Math.ceil((offset+width)/32)+1;
        ctx.save();ctx.translate(-offset,bottom);
        function polygon(points,color){
            ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
        }
        // Kontinuerlig terrænprofil: nabofelterne deler præcis samme endepunkt.
        for(let i=first;i<last;i++){
            const x=i*32,h=19+noise(i)*6,next=19+noise(i+1)*6;
            polygon([[x,2],[x,-h],[x+16,-22-noise(i+4)*9],[x+32,-next],[x+32,2]],colors[0]);
            const tall=18+noise(i+9)*15;
            if(theme==='cellar'||theme==='factory'){
                const w=18+noise(i+6)*9;
                ctx.fillStyle=colors[1];ctx.fillRect(x+3,-tall,w,tall);
                polygon([[x+3,-tall],[x+7,-tall-3],[x+w+7,-tall-3],[x+w+3,-tall]],colors[2]);
                ctx.strokeStyle=colors[0];ctx.lineWidth=.7;
                ctx.strokeRect(x+5,-tall+3,w-4,tall-6);
                if(theme==='cellar'){
                    ctx.beginPath();ctx.moveTo(x+5,-tall+3);ctx.lineTo(x+w+1,-3);ctx.stroke();
                }else{
                    ctx.fillStyle=colors[2];ctx.fillRect(x+10,-tall-9,4,tall+9);
                    ctx.fillStyle=colors[0];ctx.fillRect(x+11,-tall-8,1,tall+8);
                    for(let k=0;k<3;k++)ctx.fillRect(x+8,-tall+k*9,8,1);
                }
            }else if(theme==='citadel'){
                ctx.fillStyle=colors[1];ctx.fillRect(x+4,-tall,23,tall);
                for(let k=0;k<3;k++)ctx.fillRect(x+4+k*9,-tall-4,5,5);
                ctx.fillStyle=colors[2];ctx.fillRect(x+5,-tall,1,tall);
                ctx.fillStyle=colors[0];ctx.fillRect(x+13,-tall+7,4,8);
            }else if(noise(i+17)>.32){
                const peak=theme==='ice'||theme==='cave'?tall+3:tall;
                polygon([[x+1,1],[x+5,-19],[x+14,-peak],[x+25,-21],[x+31,1]],colors[1]);
                polygon([[x+14,-peak],[x+19,-23],[x+25,-21],[x+31,1],[x+21,-3]],colors[2]);
                polygon([[x+14,-peak],[x+11,-18],[x+1,1],[x+5,-19]],colors[0]);
                if(theme==='mountain')polygon([[x+14,-peak],[x+8,-peak+13],[x+13,-peak+10],[x+18,-peak+13]],'#b5c7c8');
                if(theme==='volcano'){
                    ctx.strokeStyle='#b46742';ctx.lineWidth=.55;ctx.beginPath();
                    ctx.moveTo(x+14,-peak+9);ctx.lineTo(x+11,-18);ctx.lineTo(x+16,-7);ctx.stroke();
                }
            }
            // Små bundfragmenter bryder gentagelsen, men er aldrig løse øer.
            for(let k=0;k<4;k++){
                const px=x+k*8,py=-8-noise(i*7+k)*9;
                polygon([[px,py+5],[px+2,py],[px+6,py+1],[px+8,py+5]],colors[k%2]);
            }
        }
        ctx.restore();
    }
    root.DextroScenery={drawMiddle};
})(globalThis);
