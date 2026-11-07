import * as THREE from 'three';
import {SVGRenderer} from 'three/addons/renderers/SVGRenderer.js';
import {WorldGesture} from './input.mjs';
import {CONFIG,MAP} from '../shared/config.mjs';
export function createVillage({onMove,onSeat,onInspect,onRank}){
 const host=document.querySelector('#world'),labels=document.querySelector('#labels');
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e6eae3');
 let renderer,software=false;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;}catch{software=true;renderer=new SVGRenderer();renderer.setQuality('low');renderer.overdraw=.3;}renderer.setSize(innerWidth,innerHeight);host.append(renderer.domElement);
 const camera=new THREE.OrthographicCamera(-15,15,15,-15,.1,120);camera.position.set(...CONFIG.camera.offset);camera.lookAt(0,0,0);
 scene.add(software?new THREE.AmbientLight(0xffffff,.65):new THREE.HemisphereLight(0xffffff,0x8eaa7b,2.5));const light=new THREE.DirectionalLight(0xfff6dc,software?.65:3);light.position.set(-8,20,10);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-20,right:20,top:20,bottom:-20});light.shadow.bias=-.001;scene.add(light);
 const mats=new Map;const mat=c=>{if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:1}));return mats.get(c);};
 function box(x,y,z,w,h,d,color,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d,Math.max(1,Math.ceil(w/2)),1,Math.max(1,Math.ceil(d/2))),mat(color));m.position.set(x,y,z);if(parent===scene&&y<.1)m.renderOrder=-100+Math.round(y*100);if(parent===scene&&h>1.5&&z< -5)m.userData.occluder=true;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 box(0,-.28,.5,25,.5,22,'#a6b495');box(0,-.01,2,23.5,.08,10,'#d6d7bc');box(0,.01,-2.4,22,.1,4.5,'#d6d7bc');box(0,.02,6.8,6,.1,7.7,'#d6d7bc');
 // Open booths, without roofs: people and work remain visible.
 for(const [x,color] of [[-6,'#4e7a62'],[6,'#b8794b']]){box(x,.06,-5.4,8.6,.16,5.2,'#e8e2cb');box(x,1.55,-7.4,8,.3+2.8,.6,color);box(x,1,-5.3,7,1.9,1.1,'#c6b48f');box(x,2,-5.3,7.2,.15,1.3,'#efe6cc');box(x<0?-10:10,1.4,-5.6,.5,2.8,4,color);box(x,3.4,-7.4,8.3,.28,.8,color);}
 for(const o of MAP.obstacles.filter(o=>o.z===5.3)){box(o.x,.55,o.z,o.w,.3,o.d,'#9f8664');box(o.x,.28,o.z,o.w-.7,.5,.65,'#758069');box(o.x,1.1,o.z+.35,o.w,.7,.18,'#9f8664');}
 box(0,1.5,-7,2.2,2,.4,'#385944');box(-.75,.6,-7,.15,1.5,.2,'#6e785e');box(.75,.6,-7,.15,1.5,.2,'#6e785e');
 // Work markers remain separate from replaceable character geometry.
 const seatLabels=new Map,staticLabels=[],actions=new WeakMap;
 function label(text,cls,position,handler){const el=document.createElement(handler?'button':'div');el.className='label '+cls;el.textContent=text;if(handler){actions.set(el,handler);el.addEventListener('click',e=>{e.stopPropagation();if(e.detail===0)handler();});}labels.append(el);const rec={el,position:new THREE.Vector3(...position)};staticLabels.push(rec);return rec;}
 for(const s of MAP.seats){const circle=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.06,24),mat(s.kind==='coffee'?'#93af79':'#d2aa78'));circle.position.set(s.x,.12,s.z);scene.add(circle);seatLabels.set(s.id,label('＋ 알바하기','seatlabel',[s.x,.6,s.z+.8],()=>onSeat(s.id)));}
 const coffee=label('커피 가게','shoplabel',[-6,3.1,-7.3]);coffee.el.append(Object.assign(document.createElement('small'),{textContent:'3잔 · 최대 300원'}));
 const margin=label('판매 가게','shoplabel sale',[6,3.1,-7.3]);margin.el.append(Object.assign(document.createElement('small'),{textContent:'마진 계산 · 최대 450원'}));
 label('일일 랭킹','seatlabel',[0,2.6,-7],onRank);
 const destination=new THREE.Mesh(new THREE.RingGeometry(.32,.43,32),new THREE.MeshBasicMaterial({color:'#f5fcdf',side:THREE.DoubleSide}));destination.rotation.x=-Math.PI/2;destination.position.y=.15;scene.add(destination);destination.visible=false;
 const actors=new Map;let mine=null,players=[],lastFrame=performance.now(),active=false;
 function actor(p){const g=new THREE.Group();scene.add(g);const body=box(0,1.05,0,.62,.75,.36,'#252d2b',g);box(0,1.21,.19,.24,.39,.03,'#8bc4db',g);box(0,1.7,0,.52,.54,.48,'#d8ba91',g);box(0,1.98,-.02,.59,.19,.54,'#624530',g);box(-.24,1.85,-.04,.1,.3,.49,'#624530',g);box(-.12,1.72,.245,.045,.045,.025,'#343a31',g);box(.12,1.72,.245,.045,.045,.025,'#343a31',g);
 const head=new THREE.Group();g.add(head);for(const child of [...g.children].filter(m=>m.position.y>1.5)){g.remove(child);head.add(child);child.position.y-=1.7;}head.position.y=1.7;
 const arms=[],legs=[];for(const sign of [-1,1]){const arm=new THREE.Group();arm.position.set(sign*.43,1.36,0);box(0,-.25,0,.2,.55,.24,'#252d2b',arm);box(0,-.57,0,.18,.16,.2,'#d8ba91',arm);g.add(arm);arms.push(arm);const leg=new THREE.Group();leg.position.set(sign*.18,.68,0);box(0,-.25,0,.25,.55,.28,'#252d2b',leg);box(0,-.52,.07,.27,.16,.43,'#171f1b',leg);g.add(leg);legs.push(leg);}
 const ring=new THREE.Mesh(new THREE.RingGeometry(.5,.63,32),new THREE.MeshBasicMaterial({color:'#e7f499',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.13;g.add(ring);
 const el=document.createElement('button');el.className='label nickname';const name=document.createElement('span'),status=document.createElement('small'),bubble=document.createElement('div');bubble.className='bubble';el.append(name,status,bubble);actions.set(el,()=>onInspect(p.id));el.onclick=e=>{e.stopPropagation();if(e.detail===0)onInspect(p.id);};labels.append(el);g.position.set(p.x,.15,p.z);return {g,head,arms,legs,ring,el,name,status,bubble,p};}
 function update(state,id){mine=id;players=state.players;const ids=new Set(players.map(p=>p.id));for(const [id,a]of actors)if(!ids.has(id)){scene.remove(a.g);a.g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});a.el.remove();actors.delete(id);}
 for(const p of players){let a=actors.get(p.id);if(!a){a=actor(p);actors.set(p.id,a);}a.p=p;a.ring.visible=p.id===mine;a.name.textContent=p.nick;a.el.classList.toggle('mine',p.id===mine);a.status.textContent=p.activity?(p.activity.done?'잠깐 쉬는 중':p.activity.kind==='coffee'?'커피 만드는 중':'마진 계산 중'):p.moving?'이동 중':'';}
 for(const [id,rec]of seatLabels){rec.el.textContent=state.seats[id]?'근무 중':'＋ 알바하기';rec.el.classList.toggle('busy',!!state.seats[id]);}
 const me=players.find(p=>p.id===mine);destination.visible=!!me?.destination;if(me?.destination)destination.position.set(me.destination.x,.15,me.destination.z);
 }
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
 const gesture=new WorldGesture(CONFIG.input);let yaw=Math.atan2(CONFIG.camera.offset[0],CONFIG.camera.offset[2]);
 const gameTarget=e=>host.contains(e.target)||labels.contains(e.target);
 document.addEventListener('pointerdown',e=>{if(!active||!gameTarget(e))return;gesture.begin(e,actions.get(e.target.closest('button')));renderer.domElement.setPointerCapture(e.pointerId);e.preventDefault();});
 document.addEventListener('pointermove',e=>{const dx=gesture.move(e);if(dx){yaw-=dx*CONFIG.camera.rotateSpeed;e.preventDefault();}},{passive:false});
 document.addEventListener('pointerup',e=>{const tap=gesture.end(e);if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);if(!active||!tap)return;if(tap.action){tap.action();return;}
 const r=renderer.domElement.getBoundingClientRect();pointer.set((tap.x-r.left)/r.width*2-1,-(tap.y-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
 const intersections=ray.intersectObjects([...actors.values()].map(a=>a.g),true);if(intersections.length){let obj=intersections[0].object;while(obj.parent&&obj.parent!==scene)obj=obj.parent;const found=[...actors].find(([,a])=>a.g===obj);if(found){onInspect(found[0]);return;}}if(ray.ray.intersectPlane(ground,hit))onMove(hit.x,hit.z);});
 document.addEventListener('pointercancel',()=>gesture.cancel());window.addEventListener('blur',()=>gesture.cancel());
 document.addEventListener('contextmenu',e=>{if(gameTarget(e))e.preventDefault();});
 function resize(){const w=host.clientWidth,h=host.clientHeight,aspect=w/h;const height=Math.max(CONFIG.camera.minHeight,CONFIG.camera.minWidth/aspect),width=height*aspect;Object.assign(camera,{left:-width/2,right:width/2,top:height/2,bottom:-height/2});camera.updateProjectionMatrix();renderer.setSize(w,h);}
 new ResizeObserver(resize).observe(host);resize();
 const focus=new THREE.Vector3(0,0,-1),pos=new THREE.Vector3(),offset=new THREE.Vector3(...CONFIG.camera.offset),projection=new THREE.Vector3();
 function place(el,v,visible=true){projection.copy(v).project(camera);el.hidden=!visible||projection.z<-1||projection.z>1||Math.abs(projection.x)>1.12||Math.abs(projection.y)>1.1;if(!el.hidden){el.style.left=(projection.x*.5+.5)*host.clientWidth+'px';el.style.top=(-projection.y*.5+.5)*host.clientHeight+'px';}}
 let timeOffset=0;
 function frame(t){const dt=Math.min(.05,(t-lastFrame)/1000);lastFrame=t;const me=actors.get(mine);if(me)focus.lerp(new THREE.Vector3(me.g.position.x*.62,0,me.g.position.z*.62-1.3),1-Math.exp(-CONFIG.camera.follow*dt));const radius=Math.hypot(CONFIG.camera.offset[0],CONFIG.camera.offset[2]);offset.set(Math.sin(yaw)*radius,CONFIG.camera.offset[1],Math.cos(yaw)*radius);camera.position.copy(focus).add(offset);camera.lookAt(focus);
 const now=Date.now()+timeOffset;const bubbleIds=players.filter(p=>p.bubble&&p.bubble.until>now).sort((a,b)=>Math.hypot(a.x-(me?.p.x||0),a.z-(me?.p.z||0))-Math.hypot(b.x-(me?.p.x||0),b.z-(me?.p.z||0))).slice(0,CONFIG.social.maxBubbles).map(p=>p.id);
 for(const a of actors.values()){const p=a.p,dx=p.x-a.g.position.x,dz=p.z-a.g.position.z;a.g.position.x+=dx*Math.min(1,dt*13);a.g.position.z+=dz*Math.min(1,dt*13);if(p.moving&&Math.hypot(dx,dz)>.01){a.g.rotation.y=Math.atan2(dx,dz);}else if(p.activity)a.g.rotation.y=Math.PI;
 a.arms.forEach(r=>r.rotation.set(0,0,0));a.head.rotation.set(0,0,0);a.legs.forEach((r,i)=>r.rotation.x=p.moving?Math.sin(t*.012+i*Math.PI)*.45:0);
 const gest=p.gesture&&p.gesture.until>now?p.gesture:null;
 // Explicit priority: gesture > working arm loop > idle/walk.
 if(gest){if(gest.index===0){a.arms[1].rotation.z=-2.4+Math.sin(t*.016)*.35;}if(gest.index===1)a.head.rotation.x=Math.sin(t*.012)*.3;if(gest.index===2)a.head.rotation.y=Math.sin(t*.014)*.45;}
 else if(p.activity&&!p.activity.done)a.arms.forEach((r,i)=>r.rotation.x=-1.1+Math.sin(t*.009+i)*.25);else if(p.moving)a.arms.forEach((r,i)=>r.rotation.x=Math.sin(t*.012+i*Math.PI)*.35);
 const distance=me?Math.hypot(p.x-me.p.x,p.z-me.p.z):0;pos.copy(a.g.position);pos.y+=2.5;place(a.el,pos,active&&distance<CONFIG.labelDistance);a.bubble.hidden=!bubbleIds.includes(p.id);if(!a.bubble.hidden)a.bubble.textContent=CONFIG.phrases[p.bubble.index];}
 for(const rec of staticLabels)place(rec.el,rec.position,active);
 scene.traverse(o=>{if(o.userData.occluder){const from=me?.g.position||focus;const cameraSide=(o.position.x-from.x)*offset.x+(o.position.z-from.z)*offset.z>0;o.visible=!cameraSide;}});renderer.render(scene,camera);requestAnimationFrame(frame);}
 requestAnimationFrame(frame);
 return {update,setActive:v=>active=v,setTimeOffset:v=>timeOffset=v};
}
