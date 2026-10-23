import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOMB_PENALTY_SECONDS,COMBO_SECONDS,GAME_HEIGHT,GAME_WIDTH,WORD_BANK,
  bestPerPlayer,evalPath,hitPointsForCombo,length,makeFruitPath,pickWords,pointSegmentDistance,
  rankByScore,rankByTime,rankingSeconds,finishTimeBonus,finalScore,seededRandom,swordSweepHitsFruit,theoreticalMaxScore,updateSwordMotion,pathInsideCore,pathReachableFromSword,swordTravelSeconds
} from '../src/game/rules.ts';

test('word bank contains only valid 3/5/7 uppercase words',()=>{
  for(const [i,bank] of WORD_BANK.entries()){
    assert.ok(bank.length>=10);
    for(const word of bank)assert.match(word,new RegExp(`^[A-Z]{${[3,5,7][i]}}$`));
  }
});
test('every round has exactly 15 letters, avoids last word where possible',()=>{
  const rng=seededRandom(10),prev=['CAT','STUDY','NETWORK'];
  for(let t=0;t<30;t++){
    const words=pickWords(rng,prev);
    assert.equal(words.map(x=>x.length).reduce((a,b)=>a+b,0),15);
    words.forEach((w,i)=>assert.notEqual(w,prev[i]));
  }
});
test('competition seed gives repeatable word list and spawn paths',()=>{
  const a=seededRandom(20261017),b=seededRandom(20261017);
  assert.deepEqual(pickWords(a),pickWords(b));
  for(let i=0;i<8;i++)assert.deepEqual(makeFruitPath(a),makeFruitPath(b));
});
test('combo uses additive bonus, not multiplied score',()=>{
  assert.deepEqual([1,2,3,4,5,15].map(hitPointsForCombo),[100,125,150,175,200,450]);
  assert.equal(theoreticalMaxScore(),4725);
  assert.equal(COMBO_SECONDS,3.5);
});
test('bomb penalty adds exactly 5 seconds per bomb',()=>{
  assert.equal(BOMB_PENALTY_SECONDS,5);
  assert.equal(rankingSeconds(42.6,2),52.6);
});
test('1000 generated fruit paths enter the reachable central arena',()=>{
  const rand=seededRandom(4557);
  for(let i=0;i<1000;i++){
    const p=makeFruitPath(rand);
    assert.equal(pathInsideCore(p),true,`bad path ${i}`);
    assert.ok(p.duration>=4.75&&p.duration<=5.80);
    const midpoint=evalPath(p,.5);
    assert.ok(midpoint.x>100&&midpoint.x<GAME_WIDTH-100);
    assert.ok(midpoint.y>80&&midpoint.y<GAME_HEIGHT-80);
  }
});
test('spawn generated on correct edges with exit on opposite edge',()=>{
  const rng=seededRandom(99);
  for(const edge of ['left','right','top','bottom']){
    for(let i=0;i<30;i++){
      const path=makeFruitPath(rng,edge);
      if(edge==='left')assert.ok(path.start.x<0&&path.end.x>GAME_WIDTH);
      if(edge==='right')assert.ok(path.start.x>GAME_WIDTH&&path.end.x<0);
      if(edge==='top')assert.ok(path.start.y<0&&path.end.y>GAME_HEIGHT);
      if(edge==='bottom')assert.ok(path.start.y>GAME_HEIGHT&&path.end.y<0);
    }
  }
});
test('sword acceleration and brakes respect limits',()=>{
  let pos={x:600,y:350},speed={x:0,y:0};
  for(let i=0;i<12;i++) {({position:pos,velocity:speed}=updateSwordMotion(pos,speed,{x:1,y:0},false,1/60));}
  assert.ok(speed.x<=520&&speed.x>400);
  assert.ok(pos.x>600);
  for(let i=0;i<12;i++)({position:pos,velocity:speed}=updateSwordMotion(pos,speed,{x:0,y:0},true,1/60));
  assert.ok(length(speed)<1e-3);
});
test('sword is constrained within game bounds',()=>{
  const r=updateSwordMotion({x:1140,y:650},{x:520,y:520},{x:1,y:1},false,.1);
  assert.ok(r.position.x<=1145&&r.position.y<=665);
  assert.equal(r.velocity.x,0);assert.equal(r.velocity.y,0);
});
test('swept collision catches crossing a moving fruit, misses distant fruit',()=>{
  const d={x:1,y:0};
  assert.equal(swordSweepHitsFruit({x:300,y:200},{x:360,y:200},{x:340,y:202},{x:341,y:202},d,d,35),true);
  assert.equal(swordSweepHitsFruit({x:300,y:200},{x:360,y:200},{x:700,y:600},{x:699,y:600},d,d,35),false);
  assert.equal(pointSegmentDistance({x:3,y:2},{x:0,y:0},{x:6,y:0}),2);
});
test('rank lists keep each player once and honor tie breakers',()=>{
  const base={id:'x',player:'A',score:500,rankSeconds:45,date:'2026-10-17',words:[],playSeconds:40,penaltySeconds:5,maxCombo:2,bombHits:1,wrongHits:0,mode:'camera',fairMode:true};
  const rs=[base,{...base,id:'y',score:700,rankSeconds:60,player:' a '},{...base,id:'z',score:700,rankSeconds:50,player:'B'},{...base,id:'q',score:600,rankSeconds:55,player:'C'}];
  assert.deepEqual(bestPerPlayer(rs,rankByScore).map(r=>r.id),['z','y','q']);
  assert.deepEqual(bestPerPlayer(rs,rankByTime).map(r=>r.id),['x','z','q']);
});

test('target paths are reachable from arena center and corners with reaction budget',()=>{
  const rng=seededRandom(501);
  for(let i=0;i<300;i++){
    const path=makeFruitPath(rng);
    assert.ok(pathReachableFromSword(path,{x:600,y:360}),`missed center path ${i}`);
  }
  assert.ok(swordTravelSeconds(600)>1.2&&swordTravelSeconds(600)<1.4);
  assert.equal(pathReachableFromSword({edge:'left',start:{x:-50,y:360},end:{x:1250,y:360},duration:.8,bend:0},{x:600,y:360}),false);
});

import {steerSwordToTarget} from '../src/game/rules.ts';
test('target-seeking sword moves toward a fixed reticle and settles without flying forever',()=>{
  let pos={x:500,y:300},vel={x:0,y:0};
  for(let i=0;i<200;i++){
    const next=steerSwordToTarget(pos,vel,{x:800,y:300},.016);
    pos=next.position;vel=next.velocity;
  }
  assert.ok(Math.abs(pos.x-800)<20,`should settle at target, got ${pos.x}`);
  assert.ok(Math.abs(vel.x)<80,`should brake near stationary reticle, got ${vel.x}`);
});
test('target-seeking can reverse direction when fingertips aim elsewhere',()=>{
  let pos={x:500,y:300},vel={x:0,y:0};
  for(let i=0;i<25;i++){({position:pos,velocity:vel}=steerSwordToTarget(pos,vel,{x:950,y:300},.016));}
  assert.ok(pos.x>500);
  for(let i=0;i<70;i++){({position:pos,velocity:vel}=steerSwordToTarget(pos,vel,{x:200,y:300},.016));}
  assert.ok(pos.x<500,`sword should turn and follow reticle, got ${pos.x}`);
});

test('final score applies EXACT 50-second formula to ranking time including bombs',()=>{
  const seconds=rankingSeconds(22.6,1); // 27.6s incl. 5s bomb penalty
  assert.ok(Math.abs(seconds-27.6)<1e-8);
  assert.equal(finishTimeBonus(Number(seconds.toFixed(2))),560);
  assert.equal(finalScore(3375,27.6),3935);
  assert.equal(finalScore(3375,50),3375);
  assert.equal(finalScore(3375,56),3225);
  assert.equal(finalScore(100,60),-150); // formula allows negative score
  assert.equal(finalScore(1500,28.25),2043.75);
});
test('leaderboard selects five distinct top players for each dimension',()=>{
  const sample=Array.from({length:8},(_,i)=>({id:String(i),player:'P'+i,score:800-i*20,rankSeconds:50+i,date:'2026-10-17',words:['CAT','STUDY','NETWORK'],playSeconds:50,penaltySeconds:0,maxCombo:5,wrongHits:0,bombHits:0,mode:'camera',fairMode:true}));
  const ranked=bestPerPlayer([...sample,{...sample[0],id:'repeat',player:' p0 ',score:1200}],rankByScore);
  assert.equal(ranked.length,5);
  assert.deepEqual(ranked.map(x=>x.player),[' p0 ','P1','P2','P3','P4']);
  assert.equal(bestPerPlayer(sample,rankByTime).length,5);
});

test('ranked points represent final score, not just the in-game combo points',()=>{
  const base={id:'a',player:'Alpha',score:finalScore(2000,32),baseScore:2000,rankSeconds:32,date:'2026-10-17',words:[],playSeconds:32,penaltySeconds:0,maxCombo:2,bombHits:0,wrongHits:0,mode:'camera',fairMode:true};
  const worse={...base,id:'b',player:'Beta',score:finalScore(2400,55),baseScore:2400,rankSeconds:55};
  assert.equal([base,worse].sort(rankByScore)[0].id,'a');
});
