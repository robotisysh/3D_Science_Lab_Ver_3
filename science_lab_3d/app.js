import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (id) => document.getElementById(id);
const materials = [
 {id:'water',name:'물',formula:'H₂O · 액체',category:'chemistry',type:'화학',icon:'💧',color:0x4cbbef,mass:50,phase:'액체',desc:'여러 물질을 녹이는 용매. 기본 기준 온도는 22°C야.'},
 {id:'salt',name:'소금',formula:'NaCl · 고체',category:'chemistry',type:'화학',icon:'🧂',color:0xe7e9e8,mass:5,phase:'고체',desc:'물에 녹아 이온으로 분산돼. 용해는 새로운 물질을 만드는 화학 반응과 달라.'},
 {id:'baking',name:'베이킹소다',formula:'NaHCO₃ · 고체',category:'chemistry',type:'화학',icon:'◌',color:0xe4e5df,mass:5,phase:'고체',desc:'산과 만나면 이산화탄소가 생기는 반응 모델에 사용해.'},
 {id:'vinegar',name:'식초',formula:'묽은 아세트산 용액',category:'chemistry',type:'화학',icon:'♧',color:0xd9c58b,mass:30,phase:'액체',desc:'베이킹소다와 반응하는 교육용 산성 용액 모델이야.'},
 {id:'indicator',name:'지시약',formula:'산·염기 지시약',category:'chemistry',type:'화학',icon:'◉',color:0xb77cff,mass:2,phase:'액체',desc:'산성·염기성에 따라 색이 달라지는 현상을 관찰해.'},
 {id:'iron',name:'철 조각',formula:'Fe · 고체',category:'chemistry',type:'화학',icon:'⬡',color:0x9baab4,mass:12,phase:'고체',desc:'금속의 성질과 산화에 대해 탐구하는 모델이야.'},
 {id:'spring',name:'스프링',formula:'탄성체 · 고체',category:'physics',type:'물리',icon:'〰',color:0x9bc4d4,mass:8,phase:'고체',desc:'힘과 변형, 탄성 에너지의 관계를 탐구해.'},
 {id:'magnet',name:'자석',formula:'자기장 모델',category:'physics',type:'물리',icon:'🧲',color:0xe86e79,mass:20,phase:'고체',desc:'자석 주변의 자기장과 철 물체의 반응을 관찰해.'},
 {id:'lens',name:'렌즈',formula:'빛의 굴절',category:'physics',type:'물리',icon:'◉',color:0x83d9f5,mass:15,phase:'고체',desc:'빛의 굴절과 초점 형성을 알아보는 모델이야.'},
 {id:'seed',name:'씨앗',formula:'발아 관찰 모델',category:'biology',type:'생물',icon:'🌱',color:0x8ecb81,mass:1,phase:'고체',desc:'물과 온도 조건을 바꾸어 발아에 영향을 주는 요인을 탐구해.'},
 {id:'leaf',name:'잎 표본',formula:'식물 조직 관찰',category:'biology',type:'생물',icon:'🍃',color:0x63c28b,mass:2,phase:'고체',desc:'식물 조직과 광합성에 관련된 관찰을 위한 표본이야.'},
 {id:'soil',name:'토양',formula:'광물·유기물 혼합물',category:'earth',type:'지구',icon:'▧',color:0x9c7858,mass:25,phase:'고체',desc:'물과 섞어 배수, 침식, 퇴적 현상을 단순 모델로 관찰해.'}
];
const categoryNames={all:'전체',chemistry:'화학',physics:'물리',biology:'생물',earth:'지구'};
let selectedCategory='all', selectedItems=[], running=false, elapsed=0, clockTimer=null, simTimer=null, toastTimer=null, labelsVisible=true, bubbles=[], extraObjects=[], reactionDone=false;
let scene,camera,renderer,controls,beakerGroup,liquid,liquidMaterial,liquidGeometry,beakerLabel,stirGroup,particleGroup,benchGroup,flameGroup;
let dragState=null;
const clock=new THREE.Clock();
const fmt=(n)=>Number(n).toFixed(1);

function initThree(){
 const mount=$('threeMount'); scene=new THREE.Scene(); scene.background=new THREE.Color(0x0b1c28); scene.fog=new THREE.Fog(0x0b1c28,9,22);
 camera=new THREE.PerspectiveCamera(38,mount.clientWidth/mount.clientHeight,.1,100);camera.position.set(5.4,4.4,7.4);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(mount.clientWidth,mount.clientHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;mount.appendChild(renderer.domElement);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.target.set(0,1.1,0);controls.minDistance=4;controls.maxDistance=12;controls.maxPolarAngle=Math.PI*.49;
 scene.add(new THREE.HemisphereLight(0x9edcff,0x26313a,2.0));const key=new THREE.DirectionalLight(0xe1f5ff,3.1);key.position.set(3,8,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);const rim=new THREE.PointLight(0x4cded2,22,12);rim.position.set(-3,3,1);scene.add(rim);const warm=new THREE.PointLight(0xffc18b,8,10);warm.position.set(3,2,-3);scene.add(warm);
 buildBench();buildBeaker();buildTools();window.addEventListener('resize',resize);renderer.domElement.style.touchAction='none';renderer.domElement.style.cursor='grab';renderer.domElement.addEventListener('pointerdown',onScenePointerDown,true);window.addEventListener('pointermove',onScenePointerMove);window.addEventListener('pointerup',onScenePointerUp);window.addEventListener('pointercancel',onScenePointerUp);animate();
}
function standard(color,roughness=.35,metalness=.1,extra={}){return new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});}
function addMesh(parent,geometry,material,pos,opts={}){const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;if(opts.rot)m.rotation.set(...opts.rot);if(opts.name)m.name=opts.name;parent.add(m);return m;}
function buildBench(){benchGroup=new THREE.Group();scene.add(benchGroup);addMesh(benchGroup,new THREE.BoxGeometry(8.8,.24,5.2),standard(0x1a2b36,.5,.22),[0,-.12,0]);const edge=addMesh(benchGroup,new THREE.BoxGeometry(8.8,.07,5.2),standard(0x31505d,.3,.45),[0,.02,0]);const grid=new THREE.GridHelper(8.7,28,0x315564,0x203d4b);grid.position.y=.012;benchGroup.add(grid);const legsMat=standard(0x101e28,.5,.45);for(const x of [-3.9,3.9])for(const z of [-2.15,2.15])addMesh(benchGroup,new THREE.BoxGeometry(.16,1.2,.16),legsMat,[x,-.72,z]);
 const back=addMesh(benchGroup,new THREE.BoxGeometry(8.8,2.8,.12),standard(0x122430,.6,.2),[0,1.25,-2.55]);back.castShadow=false;const shelf=addMesh(benchGroup,new THREE.BoxGeometry(8.8,.12,.7),standard(0x233b48,.4,.3),[0,2.0,-2.08]);
 for(let i=0;i<9;i++){const x=-3.7+i*.92;addMesh(benchGroup,new THREE.BoxGeometry(.018,2.4,.018),standard(0x28424e),[x,1.2,-2.47]);}
 // subtle floor
 const floor=addMesh(scene,new THREE.PlaneGeometry(200,200),standard(0x08131d,.8,.05),[0,-1.35,0],{rot:[-Math.PI/2,0,0]});floor.receiveShadow=true;
}
function buildBeaker(){beakerGroup=new THREE.Group();beakerGroup.position.set(0,0,0);scene.add(beakerGroup);
 const glass=new THREE.MeshPhysicalMaterial({color:0xb5e9f2,transparent:true,opacity:.20,roughness:.12,metalness:.08,side:THREE.DoubleSide,depthWrite:false,clearcoat:1,clearcoatRoughness:.08});
 const outer=new THREE.Mesh(new THREE.CylinderGeometry(.72,.62,1.62,48,1,true),glass);outer.position.y=.95;beakerGroup.add(outer);
 const bottom=addMesh(beakerGroup,new THREE.CylinderGeometry(.62,.62,.07,48),new THREE.MeshPhysicalMaterial({color:0x9dd7e6,transparent:true,opacity:.28,roughness:.12,metalness:.08}),[0,.15,0]);
 const rim=addMesh(beakerGroup,new THREE.TorusGeometry(.72,.035,10,48),standard(0xb6eaf3,.15,.1,{transparent:true,opacity:.7}),[0,1.77,0]);rim.rotation.x=Math.PI/2;
 const foot=addMesh(beakerGroup,new THREE.CylinderGeometry(.67,.67,.09,48),standard(0x83b8c7,.2,.25,{transparent:true,opacity:.65}),[0,.08,0]);
 liquidGeometry=new THREE.CylinderGeometry(.62,.57,.03,48,1,false);liquidMaterial=new THREE.MeshPhysicalMaterial({color:0x45a7cf,transparent:true,opacity:.72,roughness:.16,metalness:.05,clearcoat:.8,side:THREE.DoubleSide});liquid=addMesh(beakerGroup,liquidGeometry,liquidMaterial,[0,.2,0]);
 const ticksMat=standard(0x9fc7d1,.4,.1,{transparent:true,opacity:.55});for(let i=1;i<=5;i++)addMesh(beakerGroup,new THREE.BoxGeometry(i%2===0?.18:.1,.012,.012),ticksMat,[.61,.25+i*.23,0]);
 const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=128;const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#09202c';ctx.fillRect(0,0,256,128);ctx.strokeStyle='#4edbd0';ctx.lineWidth=3;ctx.strokeRect(4,4,248,120);ctx.fillStyle='#c4fff6';ctx.font='bold 24px sans-serif';ctx.fillText('LABVERSE',18,43);ctx.fillStyle='#84aab7';ctx.font='18px monospace';ctx.fillText('BEAKER A',18,76);ctx.fillText('250 mL',18,103);const tex=new THREE.CanvasTexture(labelCanvas);const label=addMesh(beakerGroup,new THREE.PlaneGeometry(.65,.32),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}),[0,.88,.635]);label.name='beaker-label';beakerLabel=label;
 particleGroup=new THREE.Group();beakerGroup.add(particleGroup);stirGroup=new THREE.Group();scene.add(stirGroup);const rod=addMesh(stirGroup,new THREE.CylinderGeometry(.025,.025,1.5,12),standard(0xb4cbd4,.2,.8),[1.2,1.05,.05],{rot:[0,0,-.3]});addMesh(stirGroup,new THREE.SphereGeometry(.055,16,10),standard(0x83d8ce,.2,.45),[1.42,.36,.05]);stirGroup.visible=false;
 flameGroup=new THREE.Group();scene.add(flameGroup);flameGroup.position.set(-1.4,.18,0);const base=addMesh(flameGroup,new THREE.CylinderGeometry(.22,.28,.22,24),standard(0x536b79,.3,.5),[0,.1,0]);const ring=addMesh(flameGroup,new THREE.TorusGeometry(.18,.035,8,24),standard(0x58b8ed,.2,.3),[0,.23,0]);ring.rotation.x=Math.PI/2;const flame=addMesh(flameGroup,new THREE.ConeGeometry(.12,.42,20),new THREE.MeshBasicMaterial({color:0x44b9ff,transparent:true,opacity:.8}),[0,.52,0]);flame.name='flame';flameGroup.visible=false;
 updateLiquid();
}
function buildTools(){const standMat=standard(0x526b79,.35,.55);const stand= new THREE.Group();scene.add(stand);addMesh(stand,new THREE.CylinderGeometry(.3,.35,.12,24),standMat,[-2.1,.1,-.4]);addMesh(stand,new THREE.CylinderGeometry(.07,.07,1.25,16),standMat,[-2.1,.72,-.4]);addMesh(stand,new THREE.BoxGeometry(.75,.08,.1),standMat,[-1.76,1.28,-.4]);addMesh(stand,new THREE.TorusGeometry(.19,.035,10,24),standard(0x9fcbd6,.2,.4),[-1.35,1.1,-.4],{rot:[Math.PI/2,0,0]});
 const tube= new THREE.Group();scene.add(tube);addMesh(tube,new THREE.CylinderGeometry(.13,.13,.72,24,1,true),new THREE.MeshPhysicalMaterial({color:0xa4e8f0,transparent:true,opacity:.25,side:THREE.DoubleSide}),[1.75,.62,-.65]);addMesh(tube,new THREE.SphereGeometry(.13,24,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:0xa4e8f0,transparent:true,opacity:.32}),[1.75,.26,-.65]);addMesh(tube,new THREE.TorusGeometry(.13,.018,8,24),standard(0xb1dfe6,.2,.1),[1.75,1,-.65],{rot:[Math.PI/2,0,0]});
}
function resize(){const m=$('threeMount');if(!renderer||!m.clientWidth)return;camera.aspect=m.clientWidth/m.clientHeight;camera.updateProjectionMatrix();renderer.setSize(m.clientWidth,m.clientHeight);}
function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();if(controls)controls.update();if(stirGroup?.visible)stirGroup.rotation.y+=.025+Number($('stirSlider').value)*.0007;if(flameGroup?.visible){const f=flameGroup.getObjectByName('flame');if(f){f.scale.y=.9+Math.sin(t*12)*.13;f.material.opacity=.7+Math.sin(t*9)*.12;}}for(let i=bubbles.length-1;i>=0;i--){const b=bubbles[i];b.position.y+=b.userData.speed;b.position.x+=Math.sin(t*3+b.userData.phase)*.002;if(b.position.y>b.userData.maxY){particleGroup.remove(b);bubbles.splice(i,1);}}if(running&&particleGroup.children.length<65&&Math.random()<.3)spawnBubble();if(liquid&&Number($('stirSlider').value)>0)liquid.rotation.y+=Number($('stirSlider').value)*.00003;renderer.render(scene,camera);}
function spawnBubble(){const b=new THREE.Mesh(new THREE.SphereGeometry(.025+Math.random()*.025,10,8),new THREE.MeshPhysicalMaterial({color:0xc4f9ff,transparent:true,opacity:.65,roughness:.1}));b.position.set((Math.random()-.5)*.85,.3+Math.random()*.5,(Math.random()-.5)*.65);b.userData={speed:.008+Math.random()*.015,phase:Math.random()*6,maxY:1.65};particleGroup.add(b);bubbles.push(b);}
function pointerRay(e){const rect=renderer.domElement.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);return ray;}
function onScenePointerDown(e){
 if(!renderer||e.button!==0)return;
 const ray=pointerRay(e);
 // Only solid samples are draggable. Water, vinegar, and indicator stay in the beaker.
 const solidRoots=extraObjects.filter(o=>!['liquid','beaker-solid'].includes(o.userData.materialKind)&&o.userData.materialId);
 const hits=ray.intersectObjects(solidRoots,true);
 if(hits.length){
  let root=hits[0].object;
  while(root.parent&&root.parent!==scene&&!root.userData.materialId)root=root.parent;
  if(root.userData.materialId&&!['liquid','beaker-solid'].includes(root.userData.materialKind)){ 
   e.preventDefault();e.stopImmediatePropagation();
   const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.09);const point=new THREE.Vector3();
   if(ray.ray.intersectPlane(plane,point)){
    dragState={object:root,offsetX:root.position.x-point.x,offsetZ:root.position.z-point.z,pointerId:e.pointerId};
    controls.enabled=false;renderer.domElement.style.cursor='grabbing';
    try{renderer.domElement.setPointerCapture(e.pointerId);}catch{}
    showToast(`${materials.find(m=>m.id===root.userData.materialId)?.name||'고체 시료'} 이동 중 · 실험대 위에서 놓아 줘`);
   }
   return;
  }
 }
 // Keep the existing beaker selection interaction when no solid sample was picked.
 const vesselHits=ray.intersectObjects(beakerGroup.children,true);
 if(vesselHits.length){$('sceneCaption').querySelector('b').textContent='반응 용기 A';showToast('비커 A · 250 mL');}
}
function onScenePointerMove(e){
 if(!dragState||!renderer)return;
 const ray=pointerRay(e);const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.09);const point=new THREE.Vector3();
 if(!ray.ray.intersectPlane(plane,point))return;
 const o=dragState.object;
 o.position.x=THREE.MathUtils.clamp(point.x+dragState.offsetX,-4.05,4.05);
 o.position.z=THREE.MathUtils.clamp(point.z+dragState.offsetZ,-2.15,1.95);
}
function onScenePointerUp(e){
 if(!dragState)return;
 const moved=dragState.object;dragState=null;if(controls)controls.enabled=true;if(renderer)renderer.domElement.style.cursor='grab';
 const materialId=moved.userData.materialId;const m=materials.find(x=>x.id===materialId);
 if(m){log(`${m.name} 위치 이동`,`실험대 위에서 ${m.name} 시료의 위치를 옮겼어. 시료는 고체 형태를 유지해.`);showToast(`${m.name} 위치를 옮겼어.`);}
}
function renderMaterials(){const q=$('materialSearch').value.trim().toLowerCase();const list=materials.filter(m=>(selectedCategory==='all'||m.category===selectedCategory)&&(!q||(m.name+m.formula+m.type).toLowerCase().includes(q)));$('materialCount').textContent=`${list.length} ITEMS`;$('materialGrid').innerHTML='';if(!list.length){$('materialGrid').innerHTML='<div class="no-results">검색 결과가 없어.</div>';return;}for(const m of list){const b=document.createElement('button');b.className='material-card';b.dataset.id=m.id;b.innerHTML=`<span class="material-type">${m.type}</span><span class="material-art"><span class="material-symbol" style="color:#${m.color.toString(16).padStart(6,'0')}">${m.icon}</span></span><span class="material-name">${m.name}</span><span class="material-meta">${m.formula}</span>`;b.addEventListener('click',()=>addMaterial(m.id));$('materialGrid').appendChild(b);}}
function addMaterial(id){const m=materials.find(x=>x.id===id);if(!m)return;if(selectedItems.length>=8){showToast('한 번에 재료 8종까지 추가할 수 있어.');return;}const item={...m,uid:crypto.randomUUID?.()||String(Date.now()+Math.random())};selectedItems.push(item);reactionDone=false;addMaterialProp(m,selectedItems.length-1,item.uid);renderInventory();renderMaterialState();log(`${m.name} 추가`,m.id==='soil'?`${m.formula} 입자층을 비커 바닥에 쌓았어. 질량 모델 +${fmt(m.mass)} g.`:m.phase==='액체'?`${m.formula} 액체 시료를 비커 A에 넣었어. 질량 모델 +${fmt(m.mass)} g.`:`${m.formula} 고체 시료를 고유한 형태로 실험대에 배치했어. 질량 모델 +${fmt(m.mass)} g.`);showToast(m.phase==='액체'||m.id==='soil'?`${m.name}을(를) 비커에 넣었어.`:`${m.name} 시료를 실험대에 배치했어.`);$('sceneState').textContent='재료 추가됨';}
function addMaterialProp(m,index,uid){
 // Liquids and soil are stored inside the beaker; other solid samples stay on the bench.
 if(m.phase==='액체'){
  const angle=index*2.399, r=.12+(index%3)*.08;
  const mesh=addMesh(beakerGroup,new THREE.SphereGeometry(.105,20,14),new THREE.MeshPhysicalMaterial({color:m.color,transparent:true,opacity:.8,roughness:.18}),[Math.cos(angle)*r,.28+index*.035,Math.sin(angle)*r]);
  mesh.scale.set(1,.55,1);mesh.name=`ingredient-${index}`;mesh.userData.materialId=m.id;mesh.userData.materialKind='liquid';mesh.userData.uid=uid;extraObjects.push(mesh);
  renderMaterialState();return;
 }
 if(m.id==='soil'){
  const pile=new THREE.Group();pile.name=`beaker-soil-${index}`;pile.userData.materialId=m.id;pile.userData.materialKind='beaker-solid';pile.userData.uid=uid;
  const colors=[0x76543d,0x9b7856,0x443e34,0xb19a78,0x6d624d];
  // A small mound of granular soil resting on the beaker bottom.
  for(let i=0;i<105;i++){
   const yLayer=Math.floor(Math.random()*5), maxR=.48-yLayer*.065;
   const a=Math.random()*Math.PI*2, r=Math.sqrt(Math.random())*maxR;
   const grain=addMesh(pile,new THREE.DodecahedronGeometry(.025+Math.random()*.018,0),standard(colors[i%colors.length],.96,0),[Math.cos(a)*r,.22+yLayer*.055+Math.random()*.025,Math.sin(a)*r]);
   grain.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
  }
  particleGroup.add(pile);extraObjects.push(pile);return;
 }
 const group=new THREE.Group();group.name=`sample-${m.id}-${index}`;group.userData.materialId=m.id;group.userData.uid=uid;
 // Arrange samples on the front half of the bench, outside the liquid vessel.
 const slot=index;group.position.set(-3.25+(slot%6)*1.28,.09,1.35+Math.floor(slot/6)*.72);
 const mat=standard(m.color,.38,m.id==='iron'||m.id==='magnet'?.65:.08);
 const dark=standard(0x263b45,.5,.18);
 if(m.id==='spring'){
  const pts=[];for(let i=0;i<=100;i++){const t=i/100, a=t*Math.PI*10;pts.push(new THREE.Vector3(Math.cos(a)*.13,.05+t*.48,Math.sin(a)*.13));}
  const curve=new THREE.CatmullRomCurve3(pts);const coil=addMesh(group,new THREE.TubeGeometry(curve,100,.025,8,false),standard(0xb8cbd3,.22,.82),[0,0,0]);coil.name='spring-coil';
  addMesh(group,new THREE.CylinderGeometry(.15,.15,.025,20),dark,[0,.025,0]);
 } else if(m.id==='magnet'){
  // A recognizable horseshoe magnet, with red and blue poles.
  const pts=[new THREE.Vector3(-.2,.38,0),new THREE.Vector3(-.2,.18,0),new THREE.Vector3(-.14,.07,0),new THREE.Vector3(0,.035,0),new THREE.Vector3(.14,.07,0),new THREE.Vector3(.2,.18,0),new THREE.Vector3(.2,.38,0)];
  const curve=new THREE.CatmullRomCurve3(pts);addMesh(group,new THREE.TubeGeometry(curve,36,.065,12,false),standard(0xd94f5c,.28,.48),[0,0,0]);
  addMesh(group,new THREE.BoxGeometry(.13,.12,.14),standard(0x397bd2,.25,.4),[-.2,.39,0]);addMesh(group,new THREE.BoxGeometry(.13,.12,.14),standard(0xd94f5c,.25,.4),[.2,.39,0]);
 } else if(m.id==='lens'){
  const lens=addMesh(group,new THREE.SphereGeometry(.22,32,24),new THREE.MeshPhysicalMaterial({color:0x8be4ff,transparent:true,opacity:.58,roughness:.08,metalness:.05,transmission:.25,thickness:.25}),[0,.09,0]);lens.scale.set(1,.22,.85);
  addMesh(group,new THREE.CylinderGeometry(.24,.24,.025,32),standard(0x708f9c,.28,.45),[0,.025,0]);
 } else if(m.id==='seed'){
  const seed=addMesh(group,new THREE.SphereGeometry(.14,24,16),standard(0x947047,.7,.02),[0,.13,0]);seed.scale.set(1.35,.78,.78);seed.rotation.z=.3;
  addMesh(group,new THREE.TorusGeometry(.045,.009,6,12),standard(0x4f713d,.65,.02),[.11,.17,.005],{rot:[0,0,.7]});
 } else if(m.id==='leaf'){
  const leaf=addMesh(group,new THREE.SphereGeometry(.22,24,16),standard(0x4eae69,.45,.02),[0,.13,0]);leaf.scale.set(.58,.12,1.15);leaf.rotation.y=-.35;
  const stem=addMesh(group,new THREE.CylinderGeometry(.012,.012,.32,8),standard(0xb4d49a,.5,.02),[0,.13,0],{rot:[Math.PI/2,0,.3]});
 } else if(m.id==='salt'||m.id==='baking'){
  for(let i=0;i<24;i++){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*.22;addMesh(group,new THREE.OctahedronGeometry(.025+Math.random()*.018,0),standard(m.color,.75,.02),[Math.cos(a)*r,.035+Math.random()*.035,Math.sin(a)*r]);}
 } else if(m.id==='iron'){
  const chunk=addMesh(group,new THREE.DodecahedronGeometry(.19,0),standard(0x8998a2,.3,.78),[0,.14,0]);chunk.scale.set(1.15,.72,.9);chunk.rotation.set(.2,.5,.15);
 } else {
  const solid=addMesh(group,new THREE.DodecahedronGeometry(.13,0),mat,[0,.12,0]);solid.scale.set(1.1,.8,1);
 }
 extraObjects.push(group);scene.add(group);
}
function removeMaterial(uid){
 const index=selectedItems.findIndex(x=>x.uid===uid);if(index<0)return;
 const [item]=selectedItems.splice(index,1);
 const propIndex=extraObjects.findIndex(o=>o.userData.uid===uid);
 if(propIndex>=0){const obj=extraObjects.splice(propIndex,1)[0];obj.parent?.remove(obj);obj.traverse?.(child=>{if(child.geometry)child.geometry.dispose();if(Array.isArray(child.material))child.material.forEach(mat=>mat.dispose());else child.material?.dispose();});}
 reactionDone=false;renderInventory();renderMaterialState();
 if(!selectedItems.length){$('startMass').textContent='—';$('currentMass').textContent='—';$('massBadge').textContent='대기';}
 log(`${item.name} 제거`,item.id==='soil'?'비커에서 토양 입자층을 제거했어.':item.phase==='액체'?'비커에서 액체 시료를 제거했어.':'실험대에서 고체 시료를 제거했어.');
 showToast(`${item.name}을(를) 실험에서 뺐어.`);
}
function clearProps(){
 for(const o of extraObjects){o.parent?.remove(o);o.traverse?.(child=>{if(child.geometry)child.geometry.dispose();if(Array.isArray(child.material))child.material.forEach(x=>x.dispose());else child.material?.dispose();});if(!o.traverse){o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(x=>x.dispose());else o.material?.dispose();}}
 extraObjects=[];for(const b of bubbles){particleGroup.remove(b);b.geometry.dispose();b.material.dispose();}bubbles=[];
}
function renderInventory(){
 const names=selectedItems.map(x=>x.name), liquids=selectedItems.filter(x=>x.phase==='액체'), solids=selectedItems.filter(x=>x.phase!=='액체');
 $('ingredientSummary').textContent=names.length?`실험대 ${solids.length}종 · 용액 ${liquids.length}종`:'비어 있음';
 const vesselItems=selectedItems.filter(x=>x.phase==='액체'||x.id==='soil');
 $('vesselContents').textContent=vesselItems.length?vesselItems.map(x=>x.name).join(', '):'내용물 없음';
 const vesselList=$('vesselMaterialList');
 if(vesselList){vesselList.innerHTML='';if(!vesselItems.length){vesselList.innerHTML='<span class="vessel-empty">비커에 담긴 재료가 없어.</span>';}else{for(const item of vesselItems){const row=document.createElement('div');row.className='vessel-material-item';const label=document.createElement('span');label.textContent=item.name+(item.id==='soil'?' · 입자층':' · 액체');const remove=document.createElement('button');remove.type='button';remove.className='remove-material-btn';remove.textContent='빼기';remove.setAttribute('aria-label',item.name+' 비커에서 빼기');remove.addEventListener('click',()=>removeMaterial(item.uid));row.append(label,remove);vesselList.appendChild(row);}}}
 const mass=selectedItems.reduce((s,x)=>s+x.mass,0);$('massValue').textContent=`${fmt(mass)} g`;$('phaseValue').textContent=phaseText();$('modelStatus').textContent=running?'실험 중':reactionDone?'관찰 완료':names.length?'재료 준비':'안정';
 $('sceneCaption').querySelector('small').textContent=names.length?`${liquids.length} LIQUID / ${solids.length} SOLID SAMPLES`:'BEAKER / 250 mL';
}
function phaseText(){
 const liquids=selectedItems.filter(x=>x.phase==='액체');if(!selectedItems.length)return'비어 있음';
 const t=Number($('tempSlider').value);if(t>=100&&liquids.some(x=>x.id==='water'))return'액체 가열 중(모델)';if(t<=0&&liquids.some(x=>x.id==='water'))return'동결 조건(모델)';
 if(!liquids.length)return'고체·생물·입자 시료';if(liquids.length===1)return'액체';return'액체 혼합물';
}
function renderMaterialState(){
 const liquids=selectedItems.filter(x=>x.phase==='액체');
 if(!liquids.length){liquidMaterial.opacity=.02;liquid.scale.y=1;liquid.position.y=.2;return;}
 let c=0x3d9bc5;if(liquids.some(x=>x.id==='indicator'))c=liquids.some(x=>x.id==='vinegar')?0xef6c9e:0x8c68d8;else if(liquids.some(x=>x.id==='vinegar'))c=0xb4a15e;
 liquidMaterial.color.setHex(c);const liquidMass=liquids.reduce((s,x)=>s+x.mass,0);const vol=Math.min(.65,liquidMass/100*.65);liquid.scale.y=Math.max(.3,vol/.03);liquid.position.y=.18+vol/2;liquidMaterial.opacity=.68;updateLiquid();
}
function updateLiquid(){if(!liquid)return;const liquids=selectedItems.filter(x=>x.phase==='액체');if(!liquids.length){liquidMaterial.opacity=.02;return;}const t=Number($('tempSlider').value);if(t>=100&&liquids.some(x=>x.id==='water')){liquidMaterial.color.setHex(0x83d9e9);liquidMaterial.opacity=.35;}else if(t<=0&&liquids.some(x=>x.id==='water')){liquidMaterial.color.setHex(0x9bd8fa);liquidMaterial.opacity=.8;}if(liquids.some(x=>x.id==='indicator'))liquidMaterial.color.setHex(liquids.some(x=>x.id==='vinegar')?0xef6c9e:0x8c68d8);}
function log(title,description){const empty=$('logList').querySelector('.empty-log');if(empty)empty.remove();const d=document.createElement('div');d.className='log-item';d.innerHTML=`<span class="log-time">${timeString(elapsed)}</span><span class="log-dot"></span><div><b>${escapeHTML(title)}</b><p>${escapeHTML(description)}</p></div>`;$('logList').prepend(d);}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function timeString(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2100);}
function setInsight(title,text){$('insightTitle').textContent=title;$('insightText').textContent=text;}
function runExperiment(){if(running)return;if(!selectedItems.length){showToast('먼저 재료 보관함에서 재료를 추가해 줘.');return;}running=true;reactionDone=false;elapsed=0;clearInterval(clockTimer);clockTimer=setInterval(()=>{elapsed++;$('elapsedTime').textContent=timeString(elapsed);},1000);$('runBtn').disabled=true;$('stopBtn').disabled=false;$('sceneState').textContent='실험 진행 중';$('modelStatus').textContent='반응 중';stirGroup.visible=Number($('stirSlider').value)>0;const ids=selectedItems.map(x=>x.id);const temp=Number($('tempSlider').value),conc=Number($('concSlider').value),stir=Number($('stirSlider').value);const mass=selectedItems.reduce((s,x)=>s+x.mass,0);$('startMass').textContent=`${fmt(mass)} g`;$('currentMass').textContent=`${fmt(mass)} g`;$('massBadge').textContent='초기 총질량';$('massBadge').style.color='#91e4b9';$('massBadge').style.borderColor='#30594e';
 if(ids.includes('vinegar')&&ids.includes('baking')){flameGroup.visible=false;setInsight('기체 발생 반응','식초의 아세트산과 베이킹소다의 탄산수소나트륨이 반응해 이산화탄소 기체가 발생하는 교육용 모델이야. 거품은 기체 생성의 시각적 표현이야.');log('기체 발생 관찰','거품이 생기는 반응 모델을 실행했어. 농도와 교반 세기를 바꾸면 모델의 반응 속도가 달라져.');}
 else if(ids.includes('water')&&ids.includes('salt')){setInsight('용해와 농도','소금이 물에 용해되는 모델이야. 용해는 소금이 물속에 분산되는 과정이지, 새로운 물질이 생성되는 화학 반응과는 달라. 농도는 용액 속 용질의 상대적인 양을 나타내.');log('용해 관찰','소금과 물의 용해 모델을 실행했어. 이 화면은 실제 용해 평형을 정밀 계산하지는 않아.');}
 else if(ids.includes('indicator')){setInsight('지시약의 색 변화',ids.includes('vinegar')?'산성 용액이 포함되어 지시약 색이 분홍색으로 바뀌는 모델을 표시해. 실제 색은 지시약 종류와 pH에 따라 달라져.':'지시약이 포함되어 있어. 산·염기 용액을 추가하고 색 변화를 비교해 봐.');log('색 변화 관찰','지시약 모델의 색 변화를 관찰해. 색은 산·염기 조건을 설명하기 위한 시각적 근사값이야.');}
 else if(ids.includes('seed')&&ids.includes('water')){setInsight('발아 조건 탐구','씨앗의 발아에는 물, 산소, 적절한 온도 등이 필요해. 이 프로토타입은 조건을 바꿔 보는 개념 모델이며 실제 생장 과정은 계산하지 않아.');log('발아 조건 실험','물과 씨앗을 선택했어. 온도 조건을 바꾸며 발아에 필요한 요인을 생각해 봐.');}
 else if(ids.includes('soil')&&ids.includes('water')){setInsight('토양과 물의 상호작용','토양에 물이 스며들고 입자가 이동하는 침투·침식 개념을 탐구해. 실제 결과는 토양 입자 크기와 구조에 따라 달라져.');log('토양 관찰','토양과 물을 함께 선택했어. 배수와 침식에 영향을 주는 요인을 탐구해 봐.');}
 else if(ids.includes('iron')&&temp>=50){setInsight('온도와 반응 속도','온도가 높아지면 많은 반응의 속도가 증가할 수 있어. 다만 철의 녹 발생은 산소와 수분 등 조건이 필요하고, 이 단순 모델은 녹 발생 시간을 예측하지 않아.');log('온도 조건 관찰','철 조각과 높은 온도를 선택했어. 실제 철의 산화는 이 설정만으로 즉시 발생하지 않아.');}
 else if(ids.includes('magnet')&&ids.includes('iron')){setInsight('자기력 탐구','철은 자석에 끌리는 강자성 물질이야. 이 프로토타입은 두 재료를 인식하지만 자기장과 힘의 크기를 정밀 계산하지는 않아.');log('자기력 관찰','자석과 철 조각을 함께 선택했어. 자기력은 거리와 물체의 재료에 따라 달라져.');}
 else if(ids.includes('spring')){setInsight('힘과 탄성','스프링은 변형되면 원래 모양으로 돌아가려는 탄성력을 나타내. 작은 변형 범위에서는 힘과 변형량이 비례하는 후크 법칙으로 설명할 수 있어.');log('탄성 모델 실행','스프링 재료를 선택했어. 다음 버전에서는 힘을 가해 변형량을 직접 측정하도록 확장할 수 있어.');}
 else if(ids.includes('lens')){setInsight('빛의 굴절','빛은 서로 다른 매질의 경계에서 진행 방향이 바뀔 수 있어. 렌즈의 모양과 굴절률은 초점 위치에 영향을 줘.');log('광학 모델 실행','렌즈를 선택했어. 다음 버전에서 광선 추적과 초점 거리를 추가할 수 있어.');}
 else{setInsight('실험 조건 관찰',`현재 선택한 재료 ${selectedItems.map(x=>x.name).join(', ')}의 조합에 대해 등록된 상세 반응 규칙은 아직 없어. 온도 ${temp}°C, 농도 ${conc}%, 교반 ${stir}% 조건을 기록했어. 알려지지 않은 반응 결과를 임의로 만들지 않는 방식이야.`);log('조건 기록',`온도 ${temp}°C · 농도 ${conc}% · 교반 ${stir}%. 이 조합은 아직 상세 반응 규칙이 없어 조건만 기록했어.`);}
 const speed=Math.max(.35,Math.min(2.5,(conc/50)*(1+Math.max(0,temp-20)/100)*(1+stir/150)));$('modelStatus').textContent='관찰 중';if(ids.includes('vinegar')&&ids.includes('baking')){for(let i=0;i<12;i++)setTimeout(()=>{if(running)spawnBubble();},i*140/speed);}
 simTimer=setTimeout(()=>{if(!running)return;running=false;reactionDone=true;clearInterval(clockTimer);stirGroup.visible=false;flameGroup.visible=temp>=80&&ids.includes('water');$('runBtn').disabled=false;$('stopBtn').disabled=true;$('sceneState').textContent='관찰 완료';$('modelStatus').textContent='관찰 완료';$('elapsedTime').textContent=timeString(elapsed);$('currentMass').textContent=`${fmt(mass)} g`;$('massBadge').textContent='총질량 모델';$('massBadge').style.color='#91e4b9';log('실험 종료',`교육용 질량 모델 관찰 완료. 총질량 ${fmt(mass)} g는 선택한 모든 시료를 합산한 값이야. 시료 일부는 실험대에 있으므로 실제 밀폐계 측정값과는 구분해야 해. 기체가 열린 용기 밖으로 나가는 반응은 별도 모델이 필요해.`);renderInventory();showToast('실험이 끝났어. 관찰 기록을 확인해 봐.');},Math.max(2500,5200/speed));renderInventory();}
function stopExperiment(){if(!running)return;running=false;clearTimeout(simTimer);clearInterval(clockTimer);stirGroup.visible=false;$('runBtn').disabled=false;$('stopBtn').disabled=true;$('sceneState').textContent='정지됨';$('modelStatus').textContent='정지됨';log('실험 정지','사용자가 실험을 정지했어. 현재 재료는 용기에 남아 있어.');showToast('실험을 정지했어.');}
function clearVessel(){stopExperiment();selectedItems=[];clearProps();liquidMaterial.opacity=.05;liquid.scale.y=1;liquid.position.y=.2;flameGroup.visible=false;renderInventory();renderMaterialState();$('sceneState').textContent='대기 중';setInsight('실험에서 발견하기','재료를 조합하고 조건을 바꾸면 어떤 차이가 생길까? 실험을 실행하면 관찰 결과와 과학 원리를 여기에 표시해.');$('startMass').textContent='—';$('currentMass').textContent='—';$('massBadge').textContent='대기';showToast('실험대와 비커의 시료를 모두 정리했어.');}
function resetAll(){clearVessel();elapsed=0;$('elapsedTime').textContent='00:00';$('tempSlider').value=22;$('concSlider').value=50;$('stirSlider').value=0;updateControls();controls.reset();camera.position.set(5.4,4.4,7.4);controls.target.set(0,1.1,0);$('logList').innerHTML='<div class="empty-log"><span>◎</span><b>아직 관찰 기록이 없어.</b><small>재료를 추가하고 실험 실행을 눌러 시작해 봐.</small></div>';showToast('실험 환경을 초기화했어.');}
function updateControls(){const t=Number($('tempSlider').value);$('tempValue').textContent=`${t} °C`;$('sceneTemp').textContent=`${t.toFixed(1)} °C`;$('concValue').textContent=`${$('concSlider').value}%`;$('stirValue').textContent=`${$('stirSlider').value}%`;updateLiquid();$('phaseValue').textContent=phaseText();flameGroup.visible=t>=80&&selectedItems.some(x=>x.id==='water');if(flameGroup.visible)showToast('가열 효과는 교육용 시각화야.');}
function bindUI(){$('materialSearch').addEventListener('input',renderMaterials);$('categoryTabs').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{selectedCategory=b.dataset.category;$('categoryTabs').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderMaterials();}));$('tempSlider').addEventListener('input',updateControls);$('concSlider').addEventListener('input',updateControls);$('stirSlider').addEventListener('input',()=>{updateControls();stirGroup.visible=Number($('stirSlider').value)>0;});$('runBtn').addEventListener('click',runExperiment);$('stopBtn').addEventListener('click',stopExperiment);$('clearVesselBtn').addEventListener('click',clearVessel);$('resetBtn').addEventListener('click',resetAll);$('viewBtn').addEventListener('click',()=>{camera.position.set(5.4,4.4,7.4);controls.target.set(0,1.1,0);controls.update();});$('labelsBtn').addEventListener('click',()=>{labelsVisible=!labelsVisible;beakerLabel.visible=labelsVisible;$('labelsBtn').classList.toggle('active',labelsVisible);});$('clearLogBtn').addEventListener('click',()=>{$('logList').innerHTML='<div class="empty-log"><span>◎</span><b>기록을 지웠어.</b><small>다음 실험부터 새롭게 기록할 수 있어.</small></div>';});}
initThree();bindUI();renderMaterials();renderInventory();updateControls();
