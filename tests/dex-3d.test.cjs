/* Modellens faktiske Three-geometri testes uden GPU. Canvas-teksturer stubbes;
   en særskilt visuel browserkontrol er stadig nødvendig for det færdige billede. */
const assert=require('node:assert/strict');
global.THREE=require('../docs/vendor/three.min.js');
global.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},beginPath(){},ellipse(){},fill(){}})})};
const rig=require('../docs/dex-3d-model.js'),dex=rig.create();
let frames=0;
for(const motion of ['idle','run','jump','eat','inspect','curious','pant'])for(const expression of ['happy','sleepy','grumpy'])for(let frame=0;frame<60;frame++){
    const p=dex.update(frame/60,{motion,expression,gear:'backpack',stock:frame%4});
    for(const n of Object.values(p))assert.ok(Number.isFinite(n));
    for(const n of dex.faceGeometry.attributes.position.array)assert.ok(Number.isFinite(n));
    assert.equal(dex.backpack.visible,true);frames++;
}
assert.deepEqual(rig.pose('run',0),rig.pose('run',1));
dex.update(.25,{motion:'run'});assert.ok(dex.legs[0].hip.rotation.x>0);assert.ok(dex.legs[1].hip.rotation.x<0);
for(const opening of [0,.5,1]){dex.update(0,{autoMouth:false,mouth:opening});for(const n of dex.faceGeometry.attributes.normal.array)assert.ok(Number.isFinite(n));}
dex.setSkin('clay');assert.equal(dex.skin.map,null);
dex.setSkin('mint');assert.ok(dex.skin.map);assert.equal(dex.skinName,'mint');
dex.update(0,{cgm:false,gear:'none'});assert.equal(dex.sensor.visible,false);assert.equal(dex.backpack.visible,false);
// Sidesamlingen deler geometri, UV og normaler; ikke kun omtrent samme farve.
const front=dex.faceGeometry.attributes,back=dex.backGeometry.attributes;
for(let a=0;a<=80;a++){
    const i=18*81+a;let match=-1;
    for(let j=0;j<back.position.count;j++)if(Math.hypot(front.position.getX(i)-back.position.getX(j),front.position.getY(i)-back.position.getY(j),front.position.getZ(i)-back.position.getZ(j))<1e-6){match=j;break;}
    assert.ok(match>=0,'every front edge point meets the back');
    for(const component of ['getX','getY','getZ'])assert.ok(Math.abs(front.normal[component](i)-back.normal[component](match))<1e-6);
    const wrapDifference=front.uv.getX(i)-back.uv.getX(match);
    assert.ok(Math.abs(wrapDifference-Math.round(wrapDifference))<1e-6,`matching wrapped U at edge ${a}`);
    assert.ok(Math.abs(front.uv.getY(i)-back.uv.getY(match))<1e-6);
}
assert.equal(dex.teeth.filter(t=>t.upper).length,4);
assert.equal(dex.teeth.filter(t=>!t.upper).length,4);
assert.equal(dex.teeth.filter(t=>t.kind==='incisor').length,4);
for(const opening of [.05,.25,.5,1]){
    dex.update(0,{autoMouth:false,mouth:opening});
    const rx=.67+opening*.08,ry=.025+opening*.495;
    for(const tooth of dex.teeth){
        const y=-.31+(tooth.upper?1:-1)*ry*Math.sqrt(1-(tooth.x/rx)**2);
        const lipDepth=.84*Math.sqrt(1-(tooth.x/1.02)**2-(y/1.08)**2);
        assert.ok(tooth.mesh.position.z+.05<lipDepth,'teeth stay behind the lip');
    }
}
assert.ok(dex.tongue.position.z-dex.tongue.scale.z<.25,'tongue continues into the cavity');
dex.update(.25,{motion:'idle',autoMouth:false,mouth:1});assert.ok(dex.tongue.position.z+dex.tongue.scale.z<.7,'resting tongue stays inside');
dex.update(.25,{lamp:'green'});
assert.equal(dex.lamp.material.toneMapped,false);
assert.ok(dex.lamp.material.color.g>dex.lamp.material.color.r*5);
assert.ok(dex.lamp.material.color.g>dex.lamp.material.color.b*5);
assert.ok(dex.lamp.scale.x<.08);
for(const arm of dex.arms){assert.equal(arm.fingers.length,2);assert.equal(arm.hand.children.filter(p=>p.name==='thumb').length,1);assert.ok(arm.fingers.every(f=>f.scale.x<.04));}
for(const leg of dex.legs)assert.equal(leg.foot.children.filter(p=>p.name==='sole-tread').length,8);
for(const fps of [30,60,144]){
    const state=rig.activityState();for(let i=0;i<fps*14;i++)rig.advanceActivity(state,'run',1/fps);
    assert.ok(state.effort>.999);assert.equal(state.idleSeconds,0);
    for(let i=0;i<fps*18;i++)rig.advanceActivity(state,'idle',1/fps);
    assert.ok(state.effort<1e-10);assert.ok(Math.abs(state.idleSeconds-18)<1e-8);
}
assert.equal(dex.update(0,{motion:'idle',idleSeconds:3}).inspect,0);
const breathingState=rig.activityState();breathingState.clock=1000;breathingState.effort=.7;breathingState.breathPhase=.2;
rig.advanceActivity(breathingState,'idle',1/60);
assert.ok(breathingState.breathPhase>.2&&breathingState.breathPhase<.23,'breath advances smoothly even after a long session');
assert.ok(dex.update(0,{motion:'pant',breathPhase:.25}).breath>.999);
assert.ok(dex.update(0,{motion:'pant',breathPhase:.75}).breath<.001);
assert.ok(dex.update(0,{motion:'idle',idleSeconds:7}).inspect>.99);
assert.ok(dex.gazes[0].rotation.x>.4);assert.ok(dex.legs[0].hip.rotation.x<-.9);
assert.ok(dex.update(0,{motion:'idle',idleSeconds:16,lookYaw:-.5}).curious>.99);
assert.ok(dex.torso.rotation.y<-.4);
const resumed=dex.update(0,{motion:'run',idleSeconds:16});assert.equal(resumed.inspect,0);assert.equal(resumed.curious,0);
const resting=dex.update(0,{motion:'idle',clock:.25,effort:0});const panting=dex.update(0,{motion:'run',clock:.25,effort:1});
assert.ok(panting.effort>resting.effort);assert.ok(dex.torso.scale.y>1);
// Manuel mundstyring og spisning må ikke overstyres af åndedrættet.
dex.update(0,{motion:'run',effort:1,autoMouth:false,mouth:0});assert.ok(dex.teeth.every(t=>!t.mesh.visible));
const fs=require('node:fs'),html=fs.readFileSync(require('node:path').join(__dirname,'../docs/dex-3d.html'),'utf8');
assert.equal(rig.bgDroop(6),0);assert.equal(rig.bgDroop(2.5),1);assert.equal(rig.bgDroop(19),1);
const cells=dex.backpack.children.filter(c=>c.name==='insulin-cylinder');assert.equal(cells.length,3);
for(let stock=0;stock<=3;stock++){dex.update(0,{gear:'backpack',stock});assert.equal(cells.filter(c=>c.material.emissiveIntensity>0).length,stock);}
assert.ok(new Set(cells.map(c=>c.position.z)).size===3);
for(const bg of [2.5,3,4,6,10,14,19,22]){
    dex.update(.25,{bg});
    assert.equal(dex.quills.length,3);
    assert.ok(dex.quills.every(q=>Math.abs(q.rotation.x-(q.userData.restAngle*(1-rig.bgDroop(bg))-2.1*rig.bgDroop(bg)))<1e-8));
    dex.group.updateMatrixWorld(true);
    const positions=dex.tail.geometry.attributes.position;
    for(let i=0;i<positions.count;i++)assert.ok(new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(dex.tail.matrixWorld).y>=.02499);
}
assert.ok(!/physiology-engine|game\.js|https?:\/\//.test(html));
console.log(`${frames} 3D poses passed: finite geometry, joints, loop, mouth limits, skins, attachments and standalone page.`);
