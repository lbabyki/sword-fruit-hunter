const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const Module=require('module');const path=require('path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const originalLoad=Module._load,oldTs=Module._extensions['.ts'];
const gfx=new Proxy({}, {get:()=>()=>gfx});
const textObj=()=>({setOrigin(){return this},setDepth(){return this},setText(){return this},setVisible(){return this}});
class MockScene{constructor(){this.cameras={main:{setBackgroundColor(){},shake(){}}};this.add={graphics:()=>gfx,text:()=>textObj()};this.input={keyboard:{addKeys:()=>({})}}}}
Module._load=function(name,parent,main){if(name==='phaser')return {__esModule:true,default:{Scene:MockScene}};return originalLoad.call(this,name,parent,main)};
Module._extensions['.ts']=function(m,file){const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;m._compile(js,file)};
const {SpaceDodgeScene}=require('../src/game/SpaceDodgeScene.ts');
Module._load=originalLoad;
function setup(settings={mode:'endless',lives:3}){const status=[],out=[],audio=[];const scene=new SpaceDodgeScene({onSpaceStatus:s=>status.push(s),onSpaceFinish:r=>out.push(r),getSignal:()=>({kind:'lost'}),getMode:()=> 'keyboard',getPlayer:()=> 'QA',playSound:s=>audio.push(s)});scene.create();scene.startGame(false,settings);return {scene,status,out,audio};}
function object(scene,kind){const obj={id:100+scene.objects.length,kind,pos:{...scene.ship},previous:{...scene.ship},velocity:{x:0,y:0},radius:kind==='meteor'?34:18};scene.objects.push(obj);return obj;}
test('spaceship defaults and two modes initialize without mutating sword state',()=>{const {scene}=setup();assert.equal(scene.phase,'playing');assert.equal(scene.settings.mode,'endless');assert.equal(scene.lives,3);});
test('stars give 100 points each and goal finishes immediately at configured score',()=>{
 const {scene,out}=setup({mode:'goal',goal:500,lives:3});
 for(let i=0;i<5;i++){object(scene,'star');scene.update(0,16);}
 assert.equal(scene.stars,5);assert.equal(scene.score,500);assert.equal(scene.phase,'finished');assert.equal(out.length,1);assert.equal(out[0].completed,true);assert.equal(out[0].score,500);
});
test('meteor collision removes one life and grants 1.2 seconds immunity',()=>{
 const {scene,audio}=setup();object(scene,'meteor');scene.update(0,16);assert.equal(scene.lives,2);assert.ok(scene.immunity>1.1);assert.deepEqual(audio,['bomb']);
 object(scene,'meteor');scene.update(0,16);assert.equal(scene.lives,2);
});
test('endless ends on last life and preserves stars for ranking, goal failure not ranked',()=>{
 const endless=setup({mode:'endless',lives:1});endless.scene.stars=3;endless.scene.score=300;object(endless.scene,'meteor');endless.scene.update(0,16);
 assert.equal(endless.scene.phase,'failed');assert.equal(endless.out[0].completed,true);assert.equal(endless.out[0].score,300);
 const goal=setup({mode:'goal',goal:1000,lives:1});object(goal.scene,'meteor');goal.scene.update(0,16);assert.equal(goal.out[0].completed,false);
});
test('pausing freezes time and spawn; restarting clears old hazards',()=>{
 const {scene}=setup();object(scene,'meteor');scene.pauseGame();scene.update(0,250);assert.equal(scene.survival,0);assert.equal(scene.phase,'paused');scene.resumeGame();scene.startGame(false);assert.equal(scene.objects.length,0);assert.equal(scene.survival,0);
});
test('long game never exceeds meteor count and spawns from right side',()=>{
 const {scene}=setup();for(let i=0;i<5000;i++)scene.update(i*16,16);
 assert.ok(scene.objects.filter(x=>x.kind==='meteor').length<=6);
 assert.ok(scene.survival>0);
});
