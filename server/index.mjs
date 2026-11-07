import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer} from 'ws';
import {Store} from './store.mjs';
import {World} from './world.mjs';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));mkdirSync(resolve(root,'data'),{recursive:true});
const store=new Store(process.env.DB_PATH||resolve(root,'data/village.sqlite')),world=new World(store);
const token=req=>req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('entj_session='))?.slice(13);
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const sameOrigin=req=>{if(!req.headers.origin)return true;try{return new URL(req.headers.origin).host===req.headers.host;}catch{return false;}};
const apiRates=new Map;
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://local');if(!sameOrigin(req)){json(res,403,{error:'다른 출처 요청은 허용하지 않습니다.'});return;}
 if(url.pathname==='/api/session'){
 if(req.method==='GET'){const g=store.guest(token(req));json(res,200,{guest:g?{nick:g.nick}:null});return;}
 if(req.method!=='POST'){json(res,405,{error:'Method not allowed'});return;}
 const ip=req.socket.remoteAddress,now=Date.now(),rate=apiRates.get(ip)||{start:now,count:0};if(now-rate.start>60000){rate.start=now;rate.count=0;}apiRates.set(ip,rate);if(++rate.count>60){json(res,429,{error:'잠시 후 다시 입장해 주세요.'});return;}
 let body='';for await(const chunk of req){body+=chunk;if(body.length>1024){json(res,413,{error:'입력 길이 초과'});return;}}
 let input;try{input=JSON.parse(body);}catch{json(res,400,{error:'입력을 확인해 주세요.'});return;}
 const nick=String(input.nick||'').trim().replace(/[\u0000-\u001f\u007f<>]/g,'').slice(0,12)||'ENTJ 게스트';let g=store.guest(token(req));if(g){store.rename(g.id,nick);g.nick=nick;}else{g=store.create(nick);const secure=req.headers['x-forwarded-proto']==='https'||req.socket.encrypted;res.setHeader('Set-Cookie',`entj_session=${g.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${secure?'; Secure':''}`);}json(res,200,{nick:g.nick});return;
 }
 let path=url.pathname==='/'?'/index.html':url.pathname;const base=existsSync(resolve(root,'dist/index.html'))?resolve(root,'dist'):resolve(root,'client');
 let file;if(path==='/vendor/three.js')file=resolve(root,'node_modules/three/build/three.module.js');else if(path==='/vendor/three.core.js')file=resolve(root,'node_modules/three/build/three.core.js');else if(path.startsWith('/vendor/addons/'))file=resolve(root,'node_modules/three/examples/jsm',path.slice(15));else if(path.startsWith('/shared/'))file=resolve(root,'.'+path);else file=resolve(base,'.'+path);
 if(!file.startsWith(base+'/')&&!file.startsWith(resolve(root,'shared')+'/')&&!file.startsWith(resolve(root,'node_modules/three/build')+'/')&&!file.startsWith(resolve(root,'node_modules/three/examples/jsm')+'/')){res.writeHead(403);res.end();return;}
 try{const data=readFileSync(file);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}
 }catch(e){console.error(e.message);if(!res.headersSent)json(res,500,{error:'서버 오류'});else res.end();}});
const wss=new WebSocketServer({noServer:true,maxPayload:2048});
server.on('upgrade',(req,socket,head)=>{const g=store.guest(token(req));if(req.url!=='/ws'||!g||!sameOrigin(req)){socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>{const send=m=>{if(ws.readyState===1&&ws.bufferedAmount<100000)ws.send(JSON.stringify(m));};const p=world.connect(g,send,(code,reason)=>ws.close(code,reason));ws.on('message',data=>{try{const m=JSON.parse(data);if(m&&typeof m==='object')world.handle(p,m);}catch{send({type:'notice',text:'잘못된 요청입니다.'});}});ws.on('close',()=>{if(world.players.get(p.id)===p)world.disconnect(p.id);});ws.on('error',()=>{if(world.players.get(p.id)===p)world.disconnect(p.id);});});});
setInterval(()=>world.tick(),100);const args=process.argv.slice(2);const port=Number(process.env.PORT||(args.includes('--port')?args[args.indexOf('--port')+1]:3000));const host=args.includes('--host')?args[args.indexOf('--host')+1]:'0.0.0.0';server.listen(port,host,()=>console.log(`ENTJ village ready http://${host}:${server.address().port}`));
