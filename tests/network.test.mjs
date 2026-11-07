import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {once} from 'node:events';import WebSocket from 'ws';
import {marginAnswer} from '../shared/config.mjs';
function waitFor(messages,predicate,timeout=8000){return new Promise((resolve,reject)=>{const start=Date.now(),timer=setInterval(()=>{const m=messages.find(predicate);if(m){clearInterval(timer);resolve(m);}else if(Date.now()-start>timeout){clearInterval(timer);reject(Error('network test timed out'));}},20);});}
test('real HTTP cookie and two WebSocket clients: movement, work, reward, social, duplicate tab, reconnect persistence', {timeout:25000},async()=>{
 const dir=mkdtempSync(join(tmpdir(),'entj-test-'));const proc=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:'0',DB_PATH:join(dir,'test.sqlite')},stdio:['ignore','pipe','pipe']});const sockets=[];
 try{
 const base=await new Promise((resolve,reject)=>{proc.stdout.on('data',b=>{const m=b.toString().match(/http:\/\/0.0.0.0:(\d+)/);if(m)resolve('http://127.0.0.1:'+m[1]);});proc.on('error',reject);proc.on('exit',code=>{if(code)reject(Error('server exit '+code));});});
 async function guest(nick){const r=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nick})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
 async function connect(cookie){const messages=[],ws=new WebSocket(base.replace('http','ws')+'/ws',{headers:{Cookie:cookie}});sockets.push(ws);ws.on('message',b=>messages.push(JSON.parse(b)));await once(ws,'open');const welcome=await waitFor(messages,m=>m.type==='welcome');return {ws,messages,id:welcome.id,send:m=>ws.send(JSON.stringify(m))};}
 const cookie=await guest('network A'),a=await connect(cookie),b=await connect(await guest('network B'));
 await waitFor(a.messages,m=>m.type==='state'&&m.players.length===2);a.send({type:'seat',seat:'margin-1'});const work=await waitFor(a.messages,m=>m.type==='private'&&m.activity?.kind==='margin');
 const q=work.activity.question;a.send({type:'answer',activity:work.activity.id,unit:0,choice:q.choices.indexOf(marginAnswer(q)),reward:99999});a.send({type:'answer',activity:work.activity.id,unit:0,choice:q.choices.indexOf(marginAnswer(q))});
 await waitFor(a.messages,m=>m.type==='private'&&m.money===150);b.send({type:'rank'});const ranks=await waitFor(b.messages,m=>m.type==='rank');assert.equal(ranks.top.find(r=>r.id===a.id).amount,150);
 b.send({type:'inspect',id:a.id});const inspected=await waitFor(b.messages,m=>m.type==='inspect');assert.equal(inspected.nick,'network A');assert.equal(inspected.money,150);
 a.send({type:'bubble',index:0});await waitFor(b.messages,m=>m.type==='state'&&m.players.some(p=>p.id===a.id&&p.bubble?.index===0));
 const oldClose=once(a.ws,'close'),replacement=await connect(cookie);assert.equal((await oldClose)[0],4001);assert.equal(replacement.id,a.id);const restored=await waitFor(replacement.messages,m=>m.type==='private');assert.equal(restored.money,150);assert.equal(restored.activity,null);await waitFor(b.messages,m=>m.type==='state'&&!m.seats['margin-1']&&m.players.length===2);
 replacement.ws.close();await once(replacement.ws,'close');const again=await connect(cookie);assert.equal((await waitFor(again.messages,m=>m.type==='private')).money,150);
 const invalid=await fetch(base+'/api/session',{method:'POST',headers:{Origin:'http://evil.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(invalid.status,403);
 }finally{for(const ws of sockets)ws.terminate();proc.kill();await once(proc,'exit');rmSync(dir,{recursive:true,force:true});}
});
