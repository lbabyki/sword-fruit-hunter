import test from 'node:test';import assert from 'node:assert/strict';
import {SPACE_DEFAULTS,applySpacePreset,normalizeSpaceSettings,spaceSettingsKey,meteorTrajectory,steerShip,seededSpaceRandom} from '../src/game/spaceRules.ts';
import {loadSpaceProfiles,storeSpaceProfile,deleteSpaceProfile,saveSpaceCalibration,loadSpaceCalibration,applySpaceCalibration} from '../src/game/spaceStorage.ts';
test('new settings normalize all advanced controls without NaN or out-of-range values',()=>{
 const s=normalizeSpaceSettings({spawnInterval:-10,maxConcurrent:999,meteorSize:99,dashBoost:99,dashCooldown:-2,starPoints:99999,aimSensitivity:999,immunitySeconds:-10,shieldEnabled:true,meteorClusters:true});
 assert.equal(s.spawnInterval,.5);assert.equal(s.maxConcurrent,12);assert.equal(s.meteorSize,2);
 assert.equal(s.dashBoost,4);assert.equal(s.dashCooldown,1);assert.equal(s.starPoints,500);
 assert.equal(s.aimSensitivity,2);assert.equal(s.immunitySeconds,0);assert.equal(s.shieldEnabled,true);
});
test('presets change playable difficulty while preserving mode and goal',()=>{
 const p=applySpacePreset('Extreme',{...SPACE_DEFAULTS,mode:'goal',goal:2000});assert.equal(p.lives,1);assert.equal(p.mode,'goal');assert.equal(p.goal,2000);assert.equal(p.maxConcurrent,8);
});
test('a weight-only horizontal route always moves right to left',()=>{
 const rng=seededSpaceRandom(432),settings={...SPACE_DEFAULTS,horizontalWeight:100,fallingWeight:0,risingWeight:0};
 for(let i=0;i<300;i++){const p=meteorTrajectory(rng,1,1,1200,720,settings);assert.equal(p.route,'horizontal');assert.ok(p.velocity.x<0);}
});
test('custom difficulty settings separate scoreboard but visual-only settings do not',()=>{
 const base=spaceSettingsKey(SPACE_DEFAULTS);assert.notEqual(base,spaceSettingsKey({...SPACE_DEFAULTS,starPoints:200}));
 assert.equal(base,spaceSettingsKey({...SPACE_DEFAULTS,warning:false,screenShake:false,engineTrail:false}));assert.notEqual(base,spaceSettingsKey({...SPACE_DEFAULTS,aimSensitivity:1.3}));
});
test('target steering accelerates toward cursor then brakes at target',()=>{
 const s=normalizeSpaceSettings(SPACE_DEFAULTS);let p={x:200,y:360},v={x:0,y:0};
 for(let i=0;i<200;i++){const n=steerShip(p,v,{x:600,y:360},.016,s);p=n.position;v=n.velocity;}
 assert.ok(Math.abs(p.x-600)<30);assert.ok(Math.hypot(v.x,v.y)<100);
});
test('named profiles and 2-point calibration persist in localStorage',()=>{
 const mem=new Map;globalThis.localStorage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
 const profiles=storeSpaceProfile('Thi đấu CLB',{...SPACE_DEFAULTS,starPoints:150});
 assert.equal(profiles[0].name,'Thi đấu CLB');assert.equal(loadSpaceProfiles()[0].settings.starPoints,150);
 assert.equal(deleteSpaceProfile('Thi đấu CLB').length,0);
 const c={upperLeft:{x:180,y:120},lowerRight:{x:1000,y:620}};assert.equal(saveSpaceCalibration(c),true);assert.deepEqual(loadSpaceCalibration(),c);
 assert.deepEqual(applySpaceCalibration({x:180,y:120},c),{x:55,y:55});
 assert.deepEqual(applySpaceCalibration({x:1000,y:620},c),{x:1145,y:665});
 assert.equal(saveSpaceCalibration({...c,lowerRight:{x:200,y:150}}),false);
});
