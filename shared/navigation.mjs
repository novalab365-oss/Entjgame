import {MAP} from './config.mjs';
export function walkable(x,z){return x>=MAP.minX+.4&&x<=MAP.maxX-.4&&z>=MAP.minZ+.4&&z<=MAP.maxZ-.4&&!MAP.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.35&&Math.abs(z-o.z)<o.d/2+.35);}
const step=MAP.cell, cols=Math.round((MAP.maxX-MAP.minX)/step)+1, rows=Math.round((MAP.maxZ-MAP.minZ)/step)+1;
const key=(x,z)=>z*cols+x;
const point=k=>({x:MAP.minX+(k%cols)*step,z:MAP.minZ+Math.floor(k/cols)*step});
function nearest(x,z){let best=-1,dist=Infinity; for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const p=point(key(i,j));const d=(p.x-x)**2+(p.z-z)**2;if(d<dist&&walkable(p.x,p.z)){best=key(i,j);dist=d;}}return best;}
export function findPath(from,to){if(!Number.isFinite(to.x)||!Number.isFinite(to.z))return [];
 const start=nearest(from.x,from.z),goal=nearest(to.x,to.z),queue=[start],prev=new Map([[start,-1]]);
 for(let n=0;n<queue.length;n++){const k=queue[n];if(k===goal)break;const i=k%cols,j=Math.floor(k/cols);
 for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+dx,b=j+dz;if(a<0||a>=cols||b<0||b>=rows)continue;const v=key(a,b),p=point(v);if(!prev.has(v)&&walkable(p.x,p.z)){prev.set(v,k);queue.push(v);}}}
 if(!prev.has(goal))return []; const out=[];for(let k=goal;k!==start;k=prev.get(k))out.push(point(k));out.reverse();return out;
}
