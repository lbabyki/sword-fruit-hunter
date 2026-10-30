import test from 'node:test';import assert from 'node:assert/strict';
import {meteorTrajectory,sweptCircleCollision,spaceDifficulty,maxMeteors,spaceSettingsKey,SPACE_DEFAULTS,normalizeSpaceSettings,topSpaceScores,boundShipTarget,seededSpaceRandom,safeMeteorSpawn,nextSpaceScore} from '../src/game/spaceRules.ts';
test('three meteor routes spawn from the right and always move toward left',()=>{
 const routes=new Set();const r=seededSpaceRandom(12345);
 for(let i=0;i<2000;i++){const m=meteorTrajectory(r);routes.add(m.route);assert.ok(m.position.x>1200);assert.ok(m.velocity.x<0);assert.ok(m.position.y>=0&&m.position.y<=720);if(m.route==='horizontal')assert.ok(Math.abs(m.velocity.y)<20);if(m.route==='falling')assert.ok(m.velocity.y>0);if(m.route==='rising')assert.ok(m.velocity.y<0);}
 assert.deepEqual([...routes].sort(),['falling','horizontal','rising']);
});
test('ship remains inside bounded play area and has right-side reaction strip',()=>{const t=boundShipTarget({x:9999,y:-30});assert.ok(Math.abs(t.x-984)<.00001);assert.equal(t.y,42);});
test('difficulty increases every 30s with ceiling and max meteor count',()=>{
 assert.equal(spaceDifficulty(0,true),1);assert.equal(spaceDifficulty(30,true),1.15);assert.equal(spaceDifficulty(1000,true),1.6);assert.equal(spaceDifficulty(1000,false),1);
 assert.equal(maxMeteors(0,true),4);assert.equal(maxMeteors(31,true),5);assert.equal(maxMeteors(91,true),6);
});
test('swept collision detects crossing fast object, not distant objects',()=>{
 assert.equal(sweptCircleCollision({x:0,y:0},{x:100,y:0},10,{x:60,y:30},{x:60,y:-30},10),true);
 assert.equal(sweptCircleCollision({x:0,y:0},{x:100,y:0},10,{x:50,y:100},{x:60,y:100},10),false);
});
test('safe spawning prevents immediate ship hits and stacked meteors',()=>{
 const m={position:{x:1300,y:360},velocity:{x:-300,y:0},radius:45};
 assert.equal(safeMeteorSpawn(m,[],{x:970,y:360}),false);
 assert.equal(safeMeteorSpawn(m,[],{x:300,y:100}),true);
 assert.equal(safeMeteorSpawn(m,[{id:1,kind:'meteor',pos:{x:1300,y:360},previous:{x:1300,y:360},velocity:{x:-200,y:0},radius:40}],{x:300,y:100}),false);
});
test('space settings clamp, star points, and independent ranked keys',()=>{
 assert.deepEqual(normalizeSpaceSettings(null),SPACE_DEFAULTS);assert.equal(nextSpaceScore(7),700);
 const s=normalizeSpaceSettings({mode:'goal',goal:1500,lives:12,meteorSpeed:11,shipSpeed:0,progressive:false});
 assert.equal(s.lives,10);assert.equal(s.meteorSpeed,3);assert.equal(s.shipSpeed,.5);assert.equal(s.goal,1500);
 assert.notEqual(spaceSettingsKey(s),spaceSettingsKey(SPACE_DEFAULTS));
});
test('top five sorts endless by stars and goal by completion time, with distinct players',()=>{
 const key=spaceSettingsKey(SPACE_DEFAULTS);
 const scores=Array.from({length:9},(_,i)=>({id:String(i),player:i===8?'Pilot0':`Pilot${i}`,mode:'endless',score:i*100,survivalSeconds:10+i,livesLeft:0,date:'2026-01-01',settingsKey:key,inputMode:'keyboard',qualified:false,completed:true}));
 const top=topSpaceScores(scores,'endless',key);assert.equal(top.length,5);assert.equal(top[0].score,800);
 const goalKey=spaceSettingsKey({...SPACE_DEFAULTS,mode:'goal'});
 const scoresGoal=scores.map((x,i)=>({...x,mode:'goal',settingsKey:goalKey,survivalSeconds:25-i}));
 const topGoal=topSpaceScores(scoresGoal,'goal',goalKey);assert.equal(topGoal[0].survivalSeconds,17);
});
