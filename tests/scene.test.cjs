const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
let ts;
try {ts=require('typescript');}
catch {ts=require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));}
// Headless Phaser harness. Validates the scene state machine; not equivalent to real browser QA.
const originals={load:Module._load,ts:Module._extensions['.ts']};
const GRAPHICS=new Proxy({}, {get(_target,key){return key==='__mock'?true:()=>GRAPHICS;}});
function textObject(){let visible=true;return {setDepth(){return this;},setOrigin(){return this;},setPosition(){return this;},setText(){return this;},setVisible(b){visible=b;return this;},destroy(){this.destroyed=true;},get visible(){return visible;}};}
class MockScene{
  constructor(){this.cameras={main:{setBackgroundColor(){}}};this.add={graphics:()=>GRAPHICS,text:()=>textObject()};this.input={keyboard:{addKeys:()=>({})}};}
}
Module._load=function(request,parent,isMain){if(request==='phaser')return {__esModule:true,default:{Scene:MockScene}};return originals.load.call(this,request,parent,isMain);};
Module._extensions['.ts']=function(module,filename){const raw=fs.readFileSync(filename,'utf8');const out=ts.transpileModule(raw,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;module._compile(out,filename);};
const {SwordFruitScene}=require('../src/game/SwordFruitScene.ts');
const {theoreticalMaxScore,finalScore}=require('../src/game/rules.ts');
global.localStorage={data:new Map(),getItem(key){return this.data.get(key)??null;},setItem(k,v){this.data.set(k,v);}};
function setup(){const states=[];const finishes=[];const sounds=[];const scene=new SwordFruitScene({onStatus:s=>states.push(s),onFinish:r=>finishes.push(r),playSound:effect=>sounds.push(effect),getSignal:()=>({kind:'point',direction:{x:1,y:0}}),getMode:()=> 'camera',getPlayer:()=> 'Tester'});scene.create();scene.startGame(true);return {scene,states,finishes,sounds};}
test('scene completes 3 stages and all 15 target letters with additive combo',()=>{
  const {scene,finishes}=setup();
  let collected=0;
  for(let stage=0;stage<3;stage++){
    const word=scene.words[stage];
    for(const letter of word){
      const fruit=scene.fruit.find(x=>x.kind==='target');assert.ok(fruit);assert.equal(fruit.letter,letter);
      scene.slice(fruit);collected++;
    }
    assert.equal(scene.phase,'between');
    scene.advanceStage();
  }
  assert.equal(collected,15);assert.equal(scene.phase,'finished');assert.equal(finishes.length,1);
  assert.equal(finishes[0].baseScore,theoreticalMaxScore());
  assert.equal(finishes[0].timeBonus,1250); // mocked instant 0-second completion
  assert.equal(finishes[0].score,finalScore(theoreticalMaxScore(),finishes[0].rankSeconds));
  assert.equal(finishes[0].maxCombo,15);
  assert.equal(finishes[0].words.length,3);
});
test('wrong letters reset combo without resetting progress',()=>{
  const {scene}=setup();
  const target=scene.fruit.find(x=>x.kind==='target');scene.slice(target);
  assert.equal(scene.letterIndex,1);assert.equal(scene.combo,1);assert.equal(scene.score,100);
  const wrong=scene.fruit.find(x=>x.kind==='decoy')??(()=>{scene.addFruit('decoy','Z');return scene.fruit.find(x=>x.kind==='decoy');})();
  // When randomized decoy matches requested letter, force incorrect alphabet value.
  wrong.letter=wrong.letter===scene.expected?'Z':wrong.letter;
  if(wrong.letter===scene.expected) wrong.letter='Q';
  scene.slice(wrong);
  assert.equal(scene.combo,0);assert.equal(scene.letterIndex,1);assert.equal(scene.score,100);
  assert.equal(scene.mistakes,1);
});
test('bomb applies exactly 5 seconds penalty and resets combo',()=>{
  const {scene}=setup();
  scene.slice(scene.fruit.find(x=>x.kind==='target'));
  scene.addFruit('bomb','');
  const bomb=scene.fruit.find(x=>x.kind==='bomb');assert.ok(bomb);
  scene.slice(bomb);
  assert.equal(scene.penaltySeconds,5);assert.equal(scene.combo,0);assert.equal(scene.score,100);assert.equal(scene.bombs,1);
});
test('target leaving screen generates replacement for same letter',()=>{
  const {scene}=setup();
  const old=scene.fruit.find(x=>x.kind==='target');
  old.age=old.path.duration+.1;
  scene.removeExpired();
  assert.equal(scene.fruit.filter(x=>x.kind==='target').length,0);
  scene.spawnTarget();
  const next=scene.fruit.find(x=>x.kind==='target');
  assert.ok(next);assert.equal(next.letter,old.letter);
});
test('tracking loss for >500ms pauses gameplay without adding play time',()=>{
  const {scene}=setup();
  scene.bridge.getSignal=()=>({kind:'lost',direction:{x:0,y:0},confidence:0});
  for(let t=0;t<20;t++)scene.update(0,40);
  assert.equal(scene.phase,'paused');
  const time=scene.playSeconds;
  for(let t=0;t<20;t++)scene.update(0,40);
  assert.equal(scene.playSeconds,time);
  scene.resumeGame();assert.equal(scene.phase,'playing');
});
test('long scene run maintains maximum 4 simultaneous fruit and respawns target',()=>{
  const {scene}=setup();
  for(let t=0;t<1500;t++){
    scene.update(0,40);
    assert.ok(scene.fruit.length<=4,`too many fruits at tick ${t}`);
    if(scene.phase==='playing')assert.equal(scene.fruit.filter(f=>f.kind==='target').length,1);
  }
});

test('camera sword follows projected target rather than continuously using finger direction',()=>{
  const {scene}=setup();
  scene.bridge.getSignal=()=>({kind:'point',direction:{x:-1,y:0},target:{x:1020,y:360},confidence:1});
  for(let i=0;i<30;i++)scene.update(0,16);
  assert.ok(scene.sword.x>600,`sword must move right toward cursor despite leftward finger vector: ${scene.sword.x}`);
  scene.bridge.getSignal=()=>({kind:'point',direction:{x:1,y:0},target:{x:120,y:360},confidence:1});
  for(let i=0;i<100;i++)scene.update(0,16);
  assert.ok(scene.sword.x<600,`sword must turn left when target shifts: ${scene.sword.x}`);
});
test('open palm is a braking gesture during active gameplay',()=>{
  const {scene}=setup();
  scene.bridge.getSignal=()=>({kind:'open',direction:{x:0,y:0},confidence:1});
  for(let i=0;i<35;i++)scene.update(0,16);
  assert.equal(scene.phase,'playing');
  assert.ok(Math.abs(scene.velocity.x)<1&&Math.abs(scene.velocity.y)<1);
});

test('scoring reference does not end game when play time exceeds configured seconds',()=>{
  const {scene}=setup();
  scene.playSeconds=52;
  scene.update(0,16);
  assert.equal(scene.phase,'playing');
  scene.addFruit('bomb','');
  const bomb=scene.fruit.find(f=>f.kind==='bomb');assert.ok(bomb);
  scene.slice(bomb);
  assert.equal(scene.phase,'playing');
  assert.equal(scene.penaltySeconds,5);
});
test('custom game creates extra complete words and lets players collect out of order',()=>{
  const {scene,finishes}=setup();
  scene.startGame(false,{bombsEnabled:false,bombsPerWave:0,fruitSpeed:1,swordSpeed:1,extraLetters:15,unorderedLetters:true,scoreTimeSeconds:90,pointsPerSecond:30});
  assert.equal(scene.words.length,6);
  assert.equal(scene.words.join('').length,30);
  let count=0;
  for(let stage=0;stage<6;stage++){
    while(scene.phase==='playing'){
      const live=scene.fruit.find(f=>f.kind==='target');
      assert.ok(live,`stage ${stage} has reachable target`);
      scene.slice(live);count++;
      assert.ok(count<=30);
    }
    scene.advanceStage();
  }
  assert.equal(count,30);
  assert.equal(scene.phase,'finished');
  assert.equal(finishes.length,1);
  assert.equal(finishes[0].completedLetters,30);
  assert.equal(finishes[0].scoreTimeSeconds,90);
  assert.equal(finishes[0].pointsPerSecond,30);
});
test('bomb off mode never creates bombs, irrespective of extra wave setting',()=>{
  const {scene}=setup();
  scene.startGame(false,{bombsEnabled:false,bombsPerWave:2,fruitSpeed:1,swordSpeed:1,extraLetters:0,unorderedLetters:false,scoreTimeSeconds:50,pointsPerSecond:25});
  for(let i=0;i<50;i++)scene.spawnAdditional();
  assert.equal(scene.fruit.some(f=>f.kind==='bomb'),false);
});
test('2 bombs-per-wave only launch together with new fruit',()=>{
  const {scene}=setup();
  const calls=[];
  scene.startGame(false,{bombsEnabled:true,bombsPerWave:2,fruitSpeed:1,swordSpeed:1,extraLetters:0,unorderedLetters:false,scoreTimeSeconds:50,pointsPerSecond:25});
  scene.addFruit=(kind,letter)=>{calls.push({kind,letter});return true;};
  scene.spawnAdditional();
  assert.deepEqual(calls.map(x=>x.kind),['decoy','bomb','bomb']);
  calls.length=0;
  scene.addFruit=(kind,letter)=>{calls.push({kind,letter});return kind!=='decoy';};
  scene.spawnAdditional();
  assert.deepEqual(calls.map(x=>x.kind),['decoy']);
});
test('snapshot of settings is independent of later objects',()=>{
  const {scene}=setup();
  const s={bombsEnabled:true,bombsPerWave:0,fruitSpeed:1.2,swordSpeed:1.4,extraLetters:0,unorderedLetters:false,scoreTimeSeconds:100,pointsPerSecond:40};
  scene.startGame(false,s);s.scoreTimeSeconds=50;
  assert.equal(scene.settings.scoreTimeSeconds,100);
  assert.equal(scene.settings.fruitSpeed,1.2);
});


test('successful slice, wrong fruit and bomb emit expected low-latency audio events',()=>{
  const {scene,sounds}=setup();
  scene.slice(scene.fruit.find(f=>f.kind==='target'));
  assert.deepEqual(sounds,['fruit']);
  scene.addFruit('decoy','Z');
  const decoy=scene.fruit.find(f=>f.kind==='decoy'&&f.letter==='Z');
  assert.ok(decoy);
  scene.slice(decoy);
  scene.addFruit('bomb','');
  scene.slice(scene.fruit.find(f=>f.kind==='bomb'));
  assert.deepEqual(sounds,['fruit','fruit','bomb']);
});
