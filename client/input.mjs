// Pure gesture classification. No game action is fired until a short primary tap ends.
export class WorldGesture {
 constructor({threshold=8,tapMs=500}={}){this.threshold=threshold;this.tapMs=tapMs;this.ids=new Set;this.current=null;}
 begin(e,action=null){this.ids.add(e.pointerId);if(this.ids.size>1){if(this.current)this.current.cancelled=true;return;}if(e.pointerType==='mouse'&&![0,2].includes(e.button))return;this.current={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,at:e.timeStamp,rotate:e.pointerType!=='mouse'||e.button===2,primary:e.button===0,drag:false,cancelled:false,action};}
 move(e){const d=this.current;if(!d||d.id!==e.pointerId||d.cancelled)return 0;const dx=e.clientX-d.lastX;d.lastX=e.clientX;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>this.threshold)d.drag=true;return d.drag&&d.rotate?dx:0;}
 end(e){this.move(e);const d=this.current;this.ids.delete(e.pointerId);if(!d||d.id!==e.pointerId)return null;this.current=null;return !d.cancelled&&!d.drag&&d.primary&&e.timeStamp-d.at<=this.tapMs?{action:d.action,x:e.clientX,y:e.clientY}:null;}
 cancel(){this.ids.clear();this.current=null;}
}
