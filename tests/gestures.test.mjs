import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyHand,GestureSmoother,OpenPalmTrigger,pointingTarget} from '../src/tracking/gestures.ts';
const xy=(x,y)=>({x,y,z:0});
function hand(mode='dual',movement={x:0,y:0},delta={x:.21,y:-.11}) {
  const p=Array.from({length:21},()=>xy(.4,.75));
  p[0]=xy(.43,.90);
  const fit=(mcp,pip,dip,tip,x,extended)=>{
    const origin={x,y:.65};p[mcp]=xy(origin.x,origin.y);
    if(extended){p[pip]=xy(x+delta.x*.36,.65+delta.y*.36);p[dip]=xy(x+delta.x*.72,.65+delta.y*.72);p[tip]=xy(x+delta.x,.65+delta.y);}
    else {p[pip]=xy(x,.52);p[dip]=xy(x+.012,.57);p[tip]=xy(x+.02,.65);}
  };
  fit(5,6,7,8,.35,mode==='dual'||mode==='index');
  fit(9,10,11,12,.39,mode==='dual'||mode==='middle');
  fit(13,14,15,16,.43,false);fit(17,18,19,20,.47,false);
  return p.map(v=>xy(v.x+movement.x,v.y+movement.y));
}
function openHand(){
  const p=hand('fist');
  for(const [mcp,pip,dip,tip,x] of [[5,6,7,8,.33],[9,10,11,12,.41],[13,14,15,16,.49],[17,18,19,20,.56]]){
    p[mcp]=xy(x,.64);p[pip]=xy(x,.49);p[dip]=xy(x,.39);p[tip]=xy(x,.27);
  }
  p[1]=xy(.30,.71);p[2]=xy(.24,.63);p[3]=xy(.18,.55);p[4]=xy(.11,.47);
  return p;
}
test('both fingertips are fused into one reticle',()=>{
  const s=classifyHand(hand());
  assert.equal(s.kind,'point');assert.equal(s.source,'dual');assert.ok(s.target);
  assert.ok(s.direction.x<0,'mirrored x should point left');
});
test('index-only finger remains valid when the middle finger is folded/occluded',()=>{
  const s=classifyHand(hand('index'));
  assert.equal(s.kind,'point');assert.equal(s.source,'index');assert.ok(s.target);
});
test('middle-only finger remains valid if index finger cannot be resolved',()=>{
  const s=classifyHand(hand('middle'));
  assert.equal(s.kind,'point');assert.equal(s.source,'middle');assert.ok(s.target);
});
test('partially occluded knuckles can still use a clearly separated index fingertip',()=>{
  const p=hand('index');
  p[7]=xy(.47,.45); // MediaPipe depth/occlusion can disturb the DIP geometry.
  const result=classifyHand(p);
  assert.equal(result.kind,'point');assert.equal(result.source,'index');
});
test('fingertip position changes aim with unchanged finger orientation',()=>{
  const a=classifyHand(hand('index'));
  const b=classifyHand(hand('index',{x:.13,y:-.04}));
  assert.ok(b.target.x<a.target.x);
  assert.ok(b.target.y<a.target.y);
  assert.ok(Math.abs(b.direction.x-a.direction.x)<.0001);
});
test('orientation moves the projected aim even if base knuckle stays in place',()=>{
  const a=classifyHand(hand('index',undefined,{x:.21,y:-.11}));
  const b=classifyHand(hand('index',undefined,{x:0,y:-.22}));
  assert.ok(Math.abs(a.target.x-b.target.x)>80);
});
test('one visible finger pointing down projects the sword target downwards',()=>{
  const s=classifyHand(hand('index',undefined,{x:0,y:.24}));
  assert.equal(s.kind,'point');assert.ok(s.direction.y>0);
});
test('out-of-frame camera positions clamp the reticle to playable bounds',()=>{
  assert.deepEqual(pointingTarget({x:-500,y:-500},{x:-520,y:-540},640,480,true),{x:1145,y:55});
  assert.deepEqual(pointingTarget({x:1300,y:900},{x:1200,y:850},640,480,true),{x:55,y:665});
});
test('closed fist brakes, missing landmarks marks lost',()=>{
  assert.equal(classifyHand(hand('fist')).kind,'fist');
  assert.equal(classifyHand([]).kind,'lost');
});
test('open palm has precedence over pointing',()=>{
  assert.equal(classifyHand(openHand()).kind,'open');
});
test('nonfinite or low-quality landmark points do not trigger movement',()=>{
  const p=hand('index');p[8].x=NaN;
  assert.equal(classifyHand(p).kind,'lost');
});
test('aim is accepted immediately, never subject to the previous 140 ms dwell',()=>{
  const smooth=new GestureSmoother();const raw=classifyHand(hand('index'));
  assert.equal(smooth.update(raw,1000).kind,'point');
  assert.equal(smooth.update({kind:'fist',direction:{x:0,y:0},confidence:1},1010).kind,'fist');
});
test('target filter follows hand movement without an exaggerated lag',()=>{
  const smooth=new GestureSmoother(),a=classifyHand(hand('index'));
  smooth.update(a,100);
  const b=classifyHand(hand('index',{x:.12,y:0}));
  const next=smooth.update(b,133);
  assert.equal(next.kind,'point');
  assert.ok(Math.abs(next.target.x-b.target.x)<75);
});
test('smoothed predicted aim is bounded within playable area',()=>{
  const smoother=new GestureSmoother();
  smoother.update(classifyHand(hand('index')) ,100);
  for(let i=1;i<10;i++){
    const s=smoother.update(classifyHand(hand('index',{x:.09*i,y:0})),100+16*i);
    assert.ok(s.target.x>=55&&s.target.x<=1145);
    assert.ok(s.target.y>=55&&s.target.y<=665);
  }
});
test('open palm activates exactly once per deliberate hold and release',()=>{
  const gate=new OpenPalmTrigger();
  assert.equal(gate.update('open',1000),false);
  assert.equal(gate.update('open',1421),true);
  assert.equal(gate.update('open',2000),false);
  assert.equal(gate.update('point',2050),false);
  assert.equal(gate.update('point',2291),false);
  assert.equal(gate.update('open',2300),false);
  assert.equal(gate.update('open',2730),true);
});

test('overlapping fingertips remain a valid dual-finger aim',()=>{
  const p=hand('dual');
  p[12]={...p[8],x:p[8].x+.004,y:p[8].y+.008};
  const result=classifyHand(p);
  assert.equal(result.kind,'point');
  assert.ok(result.target);
});
test('side-looking hand still accepts extended index when one folded finger looks straight',()=>{
  const p=hand('index');
  // Simulate a foreshortened little finger projecting straight despite being folded.
  p[17]=xy(.47,.65);p[18]=xy(.47,.58);p[19]=xy(.47,.56);p[20]=xy(.47,.51);
  const result=classifyHand(p);
  assert.equal(result.kind,'point');
  assert.equal(result.source,'index');
});
test('clear single fingertip can still aim with partially distorted intermediate knuckle',()=>{
  const p=hand('index');
  p[6]=xy(.425,.58);p[7]=xy(.38,.60);
  const result=classifyHand(p);
  assert.equal(result.kind,'point');assert.equal(result.source,'index');
});
test('brief occlusion retains target for <=85ms but never masks fist or open-palm',()=>{
  const g=new GestureSmoother(),initial=classifyHand(hand('index'));
  g.update(initial,1000);
  const invalid={kind:'invalid',direction:{x:0,y:0},confidence:0};
  assert.equal(g.update(invalid,1080).kind,'point');
  assert.equal(g.update(invalid,1090).kind,'invalid');
  g.update(initial,1100);
  assert.equal(g.update({kind:'fist',direction:{x:0,y:0},confidence:1},1101).kind,'fist');
});

test('foreshortened pointing shape with protruding fingertip cannot be mistaken for fist',()=>{
  const p=hand('index');
  // The landmark chain folds in projection, but the index tip is far from MCP.
  p[6]=xy(.44,.62);p[7]=xy(.45,.63);p[8]=xy(.56,.52);
  const result=classifyHand(p);
  assert.notEqual(result.kind,'fist');
});


test('dominant protruding fingertip remains valid when projected joints flatten toward the camera',()=>{
  const p=hand('index');
  p[6]=xy(.44,.63);p[7]=xy(.46,.635);p[8]=xy(.61,.635); // almost horizontal, foreshortened chain
  p[10]=xy(.40,.645);p[11]=xy(.405,.648);p[12]=xy(.445,.651); // middle mostly folded / hidden
  const result=classifyHand(p);
  assert.equal(result.kind,'point');
  assert.equal(result.source,'index');
  assert.ok(result.target);
});

test('near-camera dual fingertips still resolve to a pointing pose even when angle tests collapse',()=>{
  const p=hand('dual');
  p[6]=xy(.42,.64);p[7]=xy(.45,.645);p[8]=xy(.59,.642);
  p[10]=xy(.455,.643);p[11]=xy(.485,.647);p[12]=xy(.62,.647);
  const result=classifyHand(p);
  assert.equal(result.kind,'point');
  assert.ok(result.source==='index' || result.source==='middle' || result.source==='dual');
});
