import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,normalizeSettings,isDefaultSettings,settingsKey,
  extraWordLengths,findCollectibleIndex,remainingLetters,loadSettings,persistSettings
} from '../src/game/settings.ts';
import {pickWords,theoreticalMaxScore,finishTimeBonus,finalScore,rankByScore} from '../src/game/rules.ts';
const cache=new Map();
globalThis.localStorage={getItem:k=>cache.get(k)??null,setItem:(k,v)=>cache.set(k,v)};

test('settings have safe defaults including bombs and 50-second scoring reference',()=>{
  assert.deepEqual(normalizeSettings(null),DEFAULT_SETTINGS);
  assert.equal(isDefaultSettings(normalizeSettings({})),true);
  assert.equal(settingsKey(normalizeSettings({})),'classic-v1.3');
});
test('settings normalize invalid numbers and preserve supported options',()=>{
  const s=normalizeSettings({fruitSpeed:100,swordSpeed:-2,bombsPerWave:9,scoreTimeSeconds:999,pointsPerSecond:45,extraLetters:12,unorderedLetters:true,bombsEnabled:false});
  assert.equal(s.fruitSpeed,2);assert.equal(s.swordSpeed,.5);assert.equal(s.bombsPerWave,2);
  assert.equal(s.scoreTimeSeconds,300);assert.equal(s.pointsPerSecond,45);
  assert.equal(s.extraLetters,12);assert.equal(s.unorderedLetters,true);assert.equal(s.bombsEnabled,false);
});
test('settings persist locally and restore without modifying defaults',()=>{
  cache.clear();const custom=normalizeSettings({fruitSpeed:1.3,scoreTimeSeconds:110});
  persistSettings(custom);assert.deepEqual(loadSettings(),custom);
  assert.equal(DEFAULT_SETTINGS.scoreTimeSeconds,50);
  cache.set('sword-fruit:game-settings:v1','invalid json');assert.deepEqual(loadSettings(),DEFAULT_SETTINGS);
});
test('custom leaderboards distinguish difficulty and scoring settings',()=>{
  const one=normalizeSettings({bombsPerWave:1});const two=normalizeSettings({bombsPerWave:2});
  assert.notEqual(settingsKey(one),settingsKey(two));
  assert.notEqual(settingsKey(normalizeSettings({scoreTimeSeconds:70})),settingsKey(normalizeSettings({pointsPerSecond:30})));
});
test('additional letters always form complete words and count correctly',()=>{
  for(const n of [0,3,5,7,8,10,12,15]){
    const extras=extraWordLengths(n);
    assert.equal(extras.reduce((sum,x)=>sum+x,0),n);
    const words=pickWords(()=>.1,[],n);
    assert.equal(words.length,3+extras.length);
    assert.equal(words.join('').length,15+n);
    assert.equal(new Set(words).size,words.length);
  }
});
test('unordered collection correctly handles repeated letters with no overcollect',()=>{
  const collected=[];
  for(const letter of ['L','P','A','P','E']){
    const position=findCollectibleIndex('APPLE',collected,letter,true);
    assert.ok(position>=0);
    collected.push(position);
  }
  assert.equal(new Set(collected).size,5);
  assert.deepEqual(remainingLetters('APPLE',collected),[]);
  assert.equal(findCollectibleIndex('APPLE',collected,'P',true),-1);
  assert.equal(findCollectibleIndex('APPLE',[],'L',false),-1);
});
test('time reference is for scoring only, and negative bonuses are allowed',()=>{
  assert.equal(finishTimeBonus(52,50,25),-50);
  assert.equal(finishTimeBonus(52,90,25),950);
  assert.equal(finalScore(1000,52,90,25),1950);
  assert.equal(finalScore(1000,80,50,0),1000);
});
test('theoretical score increases with added complete stages',()=>{
  assert.equal(theoreticalMaxScore(0),4725);
  assert.ok(theoreticalMaxScore(15)>theoreticalMaxScore(0));
});


test('sound enabled by default for old save files and persists after toggling',()=>{
  cache.clear();
  const legacy={bombsEnabled:false,scoreTimeSeconds:65};
  cache.set('sword-fruit:game-settings:v1',JSON.stringify(legacy));
  assert.equal(loadSettings().soundEnabled,true);
  const silent=normalizeSettings({...loadSettings(),soundEnabled:false});
  persistSettings(silent);
  assert.equal(loadSettings().soundEnabled,false);
  assert.equal(normalizeSettings({soundEnabled:'no'}).soundEnabled,true);
});
test('mute/unmute does not alter ranking grouping or difficulty identity',()=>{
  const loud=normalizeSettings({fruitSpeed:1.4,soundEnabled:true});
  const silent=normalizeSettings({fruitSpeed:1.4,soundEnabled:false});
  assert.equal(settingsKey(loud),settingsKey(silent));
  assert.equal(settingsKey(normalizeSettings({soundEnabled:false})),'classic-v1.3');
  assert.equal(isDefaultSettings(normalizeSettings({soundEnabled:false})),true);
  assert.equal(DEFAULT_SETTINGS.soundEnabled,true);
});

test('bomb failure settings clamp 0..20 and remain backward-compatible',()=>{
  assert.equal(DEFAULT_SETTINGS.bombGameOver,false);
  assert.equal(DEFAULT_SETTINGS.bombLimit,3);
  assert.equal(normalizeSettings({bombGameOver:true,bombLimit:-9}).bombLimit,0);
  assert.equal(normalizeSettings({bombGameOver:true,bombLimit:35}).bombLimit,20);
  assert.notEqual(settingsKey(normalizeSettings({bombGameOver:true,bombLimit:0})),settingsKey(DEFAULT_SETTINGS));
});

test('existing custom leaderboard settings keys are preserved when bomb failure remains default',()=>{
 const s=normalizeSettings({fruitSpeed:1.4});
 assert.equal(settingsKey(s),'custom-v1.4:1:0:1.4:1:0:0:50:25');
});
