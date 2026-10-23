import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../src/audio/GameAudio.ts';

const originalAudioContext=globalThis.AudioContext;
class FakeParam {
  value=0;
  setValueAtTime(v){this.value=v;}
  linearRampToValueAtTime(v){this.value=v;}
  exponentialRampToValueAtTime(v){this.value=v;}
}
class FakeNode {
  gain=new FakeParam(); frequency=new FakeParam();
  connect(){return this;}
  start(){FakeAudioContext.started++;}
  stop(){FakeAudioContext.stopped++;}
}
class FakeAudioContext {
  static created=0;
  static started=0;
  static stopped=0;
  currentTime=0;sampleRate=8000;state='running';destination={};
  constructor(){FakeAudioContext.created++;}
  createGain(){return new FakeNode();}
  createOscillator(){return new FakeNode();}
  createBufferSource(){return new FakeNode();}
  createBiquadFilter(){return Object.assign(new FakeNode(),{frequency:new FakeParam()});}
  createBuffer(_channels,n){return {getChannelData:()=>new Float32Array(n)};}
  resume(){this.state='running';return Promise.resolve();}
  close(){this.state='closed';return Promise.resolve();}
}
globalThis.AudioContext=FakeAudioContext;

test('browser SFX requires first user interaction before scheduling audio',()=>{
  FakeAudioContext.created=0;FakeAudioContext.started=0;
  const audio=new GameAudio(true);
  audio.play('fruit');assert.equal(FakeAudioContext.created,0);
  audio.unlock();audio.play('fruit');
  assert.equal(FakeAudioContext.created,1);
  assert.equal(FakeAudioContext.started,2); // short noise and harmonic
  audio.dispose();
});
test('distinct bomb and UI button effects are scheduled and mute takes effect immediately',()=>{
  const audio=new GameAudio(false);
  const before=FakeAudioContext.started;
  audio.unlock();audio.play('bomb');assert.equal(FakeAudioContext.started,before);
  audio.setEnabled(true);audio.unlock();audio.play('button');audio.play('bomb');
  assert.equal(FakeAudioContext.started,before+3); // click oscillator + bomb noise/tone
  audio.setEnabled(false);audio.play('fruit');assert.equal(FakeAudioContext.started,before+3);
  audio.dispose();audio.unlock();audio.play('fruit');assert.equal(FakeAudioContext.started,before+3);
});
test('sound subsystem degrades harmlessly without browser AudioContext',()=>{
  globalThis.AudioContext=undefined;
  const audio=new GameAudio(true);
  assert.doesNotThrow(()=>{audio.unlock();audio.play('bomb');audio.dispose();});
  globalThis.AudioContext=FakeAudioContext;
});
process.on('exit',()=>{globalThis.AudioContext=originalAudioContext;});
