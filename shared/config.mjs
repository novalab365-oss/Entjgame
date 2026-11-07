export const CONFIG = {
  title: '온 세상이 ENTJ라면?', roomCapacity: 10, tickMs: 100, speed: 4.4,
  sessionDays: 30, disconnectMs: 15000, activityLeaseMs: 90000, resultLeaseMs: 30000,
  coffee: {units:3, reward:100, durationMs:7500, periodMs:1500, target:[0.43,0.63], feedbackMs:650},
  margin: {units:3, reward:150, durationMs:10000, feedbackMs:850},
  social: {durationMs:4000, cooldownMs:3000, maxBubbles:5, gestureMs:1800},
  rankingMs:8000, labelDistance:22, inspectDistance:8,
  input:{threshold:8,tapMs:500},
  camera:{rotateSpeed:0.006,offset:[10,20,19], minWidth:25, minHeight:22, follow:4},
  phrases:['돈 많이 벌었어요?','이거 마진 얼마예요?','사장님, 제가 인수할게요.','파이팅. 매출 올립시다.','쉬는 동안에도 돈은 벌어야죠.'],
  gestures:['손 흔들기','끄덕이기','고개 젓기'],
};
export const MAP={minX:-12,maxX:12,minZ:-10,maxZ:11,cell:0.5,
 obstacles:[
  {x:-6,z:-7.4,w:8,d:0.6},{x:6,z:-7.4,w:8,d:0.6},
  {x:-10,z:-5.6,w:0.5,d:4},{x:10,z:-5.6,w:0.5,d:4},
  {x:-6,z:-5.3,w:7,d:1.1},{x:6,z:-5.3,w:7,d:1.1},
  {x:-8,z:5.3,w:3.5,d:1.2},{x:8,z:5.3,w:3.5,d:1.2},
  {x:0,z:-7,w:2.2,d:0.7},
 ],
 seats:[{id:'coffee-1',kind:'coffee',x:-7.8,z:-3.8},{id:'coffee-2',kind:'coffee',x:-4.2,z:-3.8},{id:'margin-1',kind:'margin',x:4.2,z:-3.8},{id:'margin-2',kind:'margin',x:7.8,z:-3.8}]
};
export const QUESTIONS=[
 {cost:600,price:1000,choices:[20,40,60]}, {cost:1500,price:2000,choices:[25,50,75]},
 {cost:700,price:1000,choices:[20,30,40]}, {cost:2400,price:3000,choices:[10,20,30]},
 {cost:1000,price:2000,choices:[25,40,50]}, {cost:900,price:1500,choices:[30,40,60]},
 {cost:1200,price:2000,choices:[20,40,60]}, {cost:800,price:1000,choices:[10,20,25]},
];
export function marginAnswer(q){return Math.round((q.price-q.cost)/q.price*100);}
export function coffeePhase(elapsed){const p=((elapsed%CONFIG.coffee.periodMs)+CONFIG.coffee.periodMs)%CONFIG.coffee.periodMs/CONFIG.coffee.periodMs;return p<.5?p*2:2-p*2;}
export function dayKey(now){return new Date(now+9*3600000).toISOString().slice(0,10);}
