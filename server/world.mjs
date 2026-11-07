import {randomUUID} from 'node:crypto';
import {CONFIG,MAP,QUESTIONS,marginAnswer,coffeePhase,dayKey} from '../shared/config.mjs';
import {findPath} from '../shared/navigation.mjs';
export class World{
 constructor(store,{now=()=>Date.now(),random=Math.random}={}){this.store=store;this.now=now;this.random=random;this.rooms=new Map;this.players=new Map;this.roomSeq=0;this.lastTick=now();}
 connect(guest,send,close=()=>{}){const old=this.players.get(guest.id);if(old){this.disconnect(guest.id);old.close(4001,'다른 탭에서 접속했어요.');}
 let room=[...this.rooms.values()].find(r=>r.ids.size<CONFIG.roomCapacity);if(!room){room={id:++this.roomSeq,ids:new Set,seats:new Map};this.rooms.set(room.id,room);}
 const p={id:guest.id,nick:guest.nick,room:room.id,x:(room.ids.size%3-1)*.8,z:3+Math.floor(room.ids.size/3)*.7,path:[],pending:null,activity:null,send,close,lastSeen:this.now(),lastSocial:-Infinity,lastGesture:-Infinity,bubble:null,gesture:null,lastCommand:0,burst:0};room.ids.add(p.id);this.players.set(p.id,p);send({type:'welcome',id:p.id,room:room.id,now:this.now()});this.private(p);return p;
 }
 disconnect(id){const p=this.players.get(id);if(!p)return;this.release(p);const r=this.rooms.get(p.room);r.ids.delete(id);if(!r.ids.size)this.rooms.delete(r.id);this.players.delete(id);}
 release(p){if(p.activity){this.rooms.get(p.room)?.seats.delete(p.activity.seat);p.activity=null;}p.pending=null;p.path=[];}
 private(p){const a=p.activity;let activity=null;if(a){activity={id:a.id,seat:a.seat,kind:a.kind,unit:a.unit,total:CONFIG[a.kind].units,start:a.start,deadline:a.deadline,done:a.done,answered:a.answered,result:a.result,earned:a.earned};if(a.kind==='margin'&&!a.done)activity.question=a.questions[a.unit];}
 p.send({type:'private',now:this.now(),day:dayKey(this.now()),money:this.store.amount(p.id,this.now()),activity});}
 claim(p,seatId){const seat=MAP.seats.find(s=>s.id===seatId),room=this.rooms.get(p.room);if(!seat||p.activity)return;if(room.seats.has(seatId)){p.send({type:'notice',text:'이미 근무 중인 자리예요.'});return;}if(Math.hypot(p.x-seat.x,p.z-seat.z)>1){return;}
 room.seats.set(seatId,p.id);p.x=seat.x;p.z=seat.z;p.path=[];p.pending=null;this.start(p,seat);}
 start(p,seat){const now=this.now();const questions=[...QUESTIONS].sort(()=>this.random()-.5).slice(0,CONFIG.margin.units);p.activity={id:randomUUID(),seat:seat.id,kind:seat.kind,unit:0,questions,start:now,deadline:now+CONFIG[seat.kind].durationMs,expires:now+CONFIG.activityLeaseMs,done:false,answered:false,result:null,earned:0};this.private(p);}
 answer(p,msg){const a=p.activity,now=this.now();if(!a||a.done||a.answered||msg.activity!==a.id||msg.unit!==a.unit)return;
 if(a.kind==='margin'&&(!Number.isInteger(msg.choice)||msg.choice<0||msg.choice>2))return;
 let success=false;if(now<a.deadline&&now>=a.start){if(a.kind==='coffee'){const f=coffeePhase(now-a.start);success=f>=CONFIG.coffee.target[0]&&f<=CONFIG.coffee.target[1];}else success=a.questions[a.unit].choices[msg.choice]===marginAnswer(a.questions[a.unit]);}
 this.finishUnit(p,success,now>=a.deadline?'시간 초과':null,now);}
 finishUnit(p,success,reason,now){const a=p.activity;if(!a||a.answered||a.done)return;const amount=success?CONFIG[a.kind].reward:0;a.answered=true;a.result={success,amount,text:reason||(success?'성공!':'아쉬워요'),correct:a.kind==='margin'?marginAnswer(a.questions[a.unit]):null};
 if(this.store.award(`${a.id}:${a.unit}`,p.id,amount,now))a.earned+=amount;
 a.nextAt=a.kind==='coffee'?Math.max(a.deadline,now)+CONFIG.coffee.feedbackMs:now+CONFIG.margin.feedbackMs;this.private(p);}
 handle(p,msg){if(this.players.get(p.id)!==p)return;const now=this.now();p.lastSeen=now;
 if(msg.type==='ping'){p.send({type:'pong',now,echo:msg.echo});return;}
 if(now-p.lastCommand>1000){p.lastCommand=now;p.burst=0;}if(++p.burst>25)return;
 switch(msg.type){
 case 'move':if(!p.activity&&Number.isFinite(msg.x)&&Number.isFinite(msg.z)){p.pending=null;p.path=findPath(p,{x:Math.max(MAP.minX,Math.min(MAP.maxX,msg.x)),z:Math.max(MAP.minZ,Math.min(MAP.maxZ,msg.z))});}break;
 case 'seat':{if(p.activity)break;const s=MAP.seats.find(s=>s.id===msg.seat);if(!s)break;if(this.rooms.get(p.room).seats.has(s.id)){p.send({type:'notice',text:'근무 중이에요. 다른 빈 자리를 골라주세요.'});break;}p.pending=s.id;p.path=findPath(p,s);if(!p.path.length)this.claim(p,s.id);break;}
 case 'answer':this.answer(p,msg);break;
 case 'leave':this.release(p);this.private(p);break;
 case 'again':if(p.activity?.done){const s=MAP.seats.find(s=>s.id===p.activity.seat);this.start(p,s);}break;
 case 'bubble':if(Number.isInteger(msg.index)&&CONFIG.phrases[msg.index]&&now-p.lastSocial>=CONFIG.social.cooldownMs){p.bubble={index:msg.index,until:now+CONFIG.social.durationMs};p.lastSocial=now;}break;
 case 'gesture':if(Number.isInteger(msg.index)&&CONFIG.gestures[msg.index]&&now-p.lastGesture>=CONFIG.social.cooldownMs){p.gesture={index:msg.index,start:now,until:now+CONFIG.social.gestureMs};p.lastGesture=now;}break;
 case 'rank':p.send({type:'rank',...this.store.ranking(p.id,now)});break;
 case 'inspect':{const q=this.players.get(msg.id);if(q&&q.room===p.room&&Math.hypot(q.x-p.x,q.z-p.z)<=CONFIG.inspectDistance)p.send({type:'inspect',nick:q.nick,money:this.store.amount(q.id,now)});else p.send({type:'notice',text:'조금 더 가까이 다가가 주세요.'});break;}
 }
 }
 tick(){const now=this.now(),dt=Math.min(.25,(now-this.lastTick)/1000);this.lastTick=now;
 for(const p of [...this.players.values()]){
 if(now-p.lastSeen>CONFIG.disconnectMs){this.disconnect(p.id);p.close(4000,'연결 시간 초과');continue;}
 if(!p.activity){let remaining=CONFIG.speed*dt;while(p.path.length&&remaining>0){const t=p.path[0],d=Math.hypot(t.x-p.x,t.z-p.z);if(d<=remaining){p.x=t.x;p.z=t.z;p.path.shift();remaining-=d;}else{p.x+=(t.x-p.x)/d*remaining;p.z+=(t.z-p.z)/d*remaining;remaining=0;}}if(!p.path.length&&p.pending){const id=p.pending;p.pending=null;this.claim(p,id);}}
 const a=p.activity;if(a){if(now>=a.expires){this.release(p);this.private(p);p.send({type:'notice',text:'근무 시간이 끝나 자리를 반환했어요.'});}else if(!a.done){if(!a.answered&&now>=a.deadline)this.finishUnit(p,false,'시간 초과',now);if(a.answered&&now>=a.nextAt){a.unit++;if(a.unit>=CONFIG[a.kind].units){a.done=true;a.expires=now+CONFIG.resultLeaseMs;}else{a.start=now;a.deadline=now+CONFIG[a.kind].durationMs;a.answered=false;a.result=null;}this.private(p);}}}
 }
 for(const room of this.rooms.values()){const players=[...room.ids].map(id=>{const p=this.players.get(id);return {id,nick:p.nick,x:p.x,z:p.z,moving:!!p.path.length,activity:p.activity?{kind:p.activity.kind,done:p.activity.done}:null,bubble:p.bubble?.until>now?p.bubble:null,gesture:p.gesture?.until>now?p.gesture:null,money:this.store.amount(id,now),destination:p.path.at(-1)||null};});const msg={type:'state',now,day:dayKey(now),room:room.id,players,seats:Object.fromEntries(room.seats)};for(const id of room.ids)this.players.get(id).send(msg);}
 }
}
