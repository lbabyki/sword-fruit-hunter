import {clamp, length, normalize, GAME_WIDTH, GAME_HEIGHT, type Vector} from '../game/rules.ts';

export type HandPoint = {x:number;y:number;z?:number};
export type GestureKind = 'point'|'dash'|'open'|'fist'|'invalid'|'lost';
export type GestureSignal = {kind:GestureKind;direction:Vector;confidence:number;target?:Vector;source?:'index';latencyMs?:number;observedAtMs?:number};
const ZERO:Vector={x:0,y:0};
const DEADZONE=55;
// These are intentionally separate so device-specific calibration can be added later.
const VIEW_CROP_X=.10, VIEW_CROP_Y=.09, VIEW_SPAN_X=.80, VIEW_SPAN_Y=.82;
const RAY_GAIN=.20; // Lower projection gain reduces swings when the finger turns edge-on.
const vec=(a:Vector,b:Vector):Vector=>({x:a.x-b.x,y:a.y-b.y});
function projected(point:HandPoint,w:number,h:number):Vector {return {x:point.x*w,y:point.y*h};}
function angle(a:Vector,b:Vector,c:Vector) {
  const u=normalize(vec(a,b)),v=normalize(vec(c,b));
  return Math.acos(clamp(u.x*v.x+u.y*v.y,-1,1))*180/Math.PI;
}
function fingerAngle(p:Vector[],mcp:number,pip:number,tip:number) {return angle(p[mcp],p[pip],p[tip]);}
function validPoints(landmarks:readonly HandPoint[]):boolean {
  return landmarks.length>=21 && landmarks.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y));
}

// Finger TIP is the primary screen cursor; its direction (MCP -> TIP) extends the cursor
// forward a modest amount. No 3-D screen-ray intersection is claimed for a mono webcam.
export function pointingTarget(tip:Vector,base:Vector,frameW:number,frameH:number,mirrored=true):Vector {
  const projectedTip={x:tip.x+(tip.x-base.x)*RAY_GAIN,y:tip.y+(tip.y-base.y)*RAY_GAIN};
  const x=mirrored?1-projectedTip.x/frameW:projectedTip.x/frameW;
  const y=projectedTip.y/frameH;
  return {
    x:DEADZONE+clamp((x-VIEW_CROP_X)/VIEW_SPAN_X,0,1)*(GAME_WIDTH-2*DEADZONE),
    y:DEADZONE+clamp((y-VIEW_CROP_Y)/VIEW_SPAN_Y,0,1)*(GAME_HEIGHT-2*DEADZONE)
  };
}

type Candidate={tip:Vector;base:Vector;direction:Vector;quality:number;name:'index'|'middle'};
// World landmarks are supplied by MediaPipe when available. Their 3-D joint
// angles remain meaningful when a finger points almost directly at the webcam.
function worldAngle(world:readonly HandPoint[]|undefined, mcp:number,pip:number,tip:number):number|null {
  if(!world||world.length<21)return null;
  const a=world[mcp],b=world[pip],c=world[tip];
  if(![a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z].every(v=>typeof v==='number'&&Number.isFinite(v)))return null;
  const u={x:a.x-b.x,y:a.y-b.y,z:(a.z??0)-(b.z??0)};
  const v={x:c.x-b.x,y:c.y-b.y,z:(c.z??0)-(b.z??0)};
  const dot=u.x*v.x+u.y*v.y+u.z*v.z;
  const denom=Math.hypot(u.x,u.y,u.z)*Math.hypot(v.x,v.y,v.z);
  return denom>1e-6?Math.acos(clamp(dot/denom,-1,1))*180/Math.PI:null;
}
function extensionScore(p:Vector[],mcp:number,pip:number,dip:number,tip:number,world?:readonly HandPoint[]):number {
  const first=worldAngle(world,mcp,pip,tip)??fingerAngle(p,mcp,pip,tip);
  const last=worldAngle(world,pip,dip,tip)??angle(p[pip],p[dip],p[tip]);
  return Math.min(first,last);
}
function indexCandidate(p:Vector[], palm:number,frameH:number,world?:readonly HandPoint[]):Candidate|null {
  const tip=p[8],base=p[5];
  const reach=length(vec(tip,base));
  const knuckle=length(vec(p[6],base));
  const straight=extensionScore(p,5,6,7,8,world);
  const strong=straight>=138;
  const extendedWorld=(worldAngle(world,5,6,8)??0)>=148 && (worldAngle(world,6,7,8)??0)>=135;
  const visiblyForward=reach>=Math.max(frameH*.060,palm*.66,knuckle*1.12);
  const protrudes=reach>=Math.max(frameH*.108,palm*1.22);
  const oblique=visiblyForward && (straight>=100||protrudes);
  // A true camera-facing finger can have a tiny 2-D projection. Only accept
  // this as extended with explicit 3-D evidence; never infer a fake 2-D ray.
  const worldFallback=extendedWorld && reach>=Math.max(frameH*.018,palm*.10);
  if(!(strong&&reach>=Math.max(frameH*.030,palm*.30))&&!oblique&&!worldFallback)return null;
  const delta=vec(tip,base);
  const direction=normalize(delta);
  const quality=clamp((strong?.68:.32)+(extendedWorld?.12:0)+Math.min(.15,reach/(palm*8)),.3,.95);
  return {tip,base:reach<frameH*.038?tip:base,direction,quality,name:'index'};
}
function middleRaised(p:Vector[],palm:number,frameH:number,world?:readonly HandPoint[]):boolean {
  const reach=length(vec(p[12],p[9]));
  const score=extensionScore(p,9,10,11,12,world);
  const worldExtended=(worldAngle(world,9,10,12)??0)>150 && (worldAngle(world,10,11,12)??0)>138;
  return (score>=142 && reach>=Math.max(frameH*.07,palm*.76))
    || (score>=108 && reach>=Math.max(frameH*.09,palm*.90))
    || (worldExtended && reach>=Math.max(frameH*.018,palm*.15));
}
function otherFingersOpen(p:Vector[],world?:readonly HandPoint[]):boolean {
  const ring=(worldAngle(world,13,14,16)??fingerAngle(p,13,14,16))>153;
  const pinky=(worldAngle(world,17,18,20)??fingerAngle(p,17,18,20))>153;
  return ring&&pinky;
}

// Use evidence from the *whole palm* before checking the index/middle Dash.
// MediaPipe's thumb joints are often bent in 2-D even when the thumb is visibly
// spread sideways. The old all-angles>153 + straight-thumb test failed on that
// normal five-finger pose and incorrectly classified it as Dash.
function openPalmExtended(p:Vector[],mcp:number,pip:number,dip:number,tip:number,
    wrist:number,palm:number,frameH:number,world?:readonly HandPoint[]):boolean {
  const reach=length(vec(p[tip],p[mcp]));
  const wristTip=length(vec(p[tip],p[wrist]));
  const wristPip=length(vec(p[pip],p[wrist]));
  const straight2d=fingerAngle(p,mcp,pip,tip)>=139 && angle(p[pip],p[dip],p[tip])>=128;
  const wa=worldAngle(world,mcp,pip,tip);
  const wd=worldAngle(world,pip,dip,tip);
  const straight3d=wa!==null&&wd!==null&&wa>=143&&wd>=127;
  return (straight2d||straight3d)
    && reach>=Math.max(frameH*.036,palm*.44)
    && wristTip>=wristPip*1.035;
}
function isFullOpenPalm(p:Vector[],palm:number,frameH:number,world?:readonly HandPoint[]):boolean {
  // All four long fingers must extend. Requiring both ring and pinky prevents
  // the index+middle pose from accidentally starting/restarting a game.
  const raised=([
    [5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]
  ] as const).every(([mcp,pip,dip,tip])=>
    openPalmExtended(p,mcp,pip,dip,tip,0,palm,frameH,world));
  if(!raised)return false;
  // Thumb is sideways in the user's photo: use spread and separation from the
  // palm rather than demanding a nearly 180-degree thumb-joint angle.
  const thumbReach=length(vec(p[4],p[5]));
  const thumbSeparation=length(vec(p[4],p[9]))-length(vec(p[3],p[9]));
  const thumbTipSegment=length(vec(p[4],p[3]));
  return thumbReach>=Math.max(frameH*.028,palm*.57)
    && thumbSeparation>=palm*.09
    && thumbTipSegment>=Math.max(frameH*.008,palm*.065);
}

// Consistent mapping for both Sword Fruit and Space Dodge:
//   INDEX only -> move to index TIP target
//   INDEX + MIDDLE -> same index TIP target, one Dash event (Space Dodge only)
//   MIDDLE only -> invalid; full palm -> start/resume; fist -> brake.
// This is a rules-based landmark classifier, NOT a newly trained ML model.
export function classifyHand(landmarks:readonly HandPoint[],frameW=640,frameH=480,mirrored=true,world?:readonly HandPoint[]):GestureSignal {
  if(!validPoints(landmarks) || frameW<=0 || frameH<=0)return {kind:'lost',direction:ZERO,confidence:0};
  const p=landmarks.map(point=>projected(point,frameW,frameH));
  const i=worldAngle(world,5,6,8)??fingerAngle(p,5,6,8);
  const m=worldAngle(world,9,10,12)??fingerAngle(p,9,10,12);
  const r=worldAngle(world,13,14,16)??fingerAngle(p,13,14,16);
  const pink=worldAngle(world,17,18,20)??fingerAngle(p,17,18,20);
  const palm=Math.max(1,length(vec(p[5],p[17])));
  // Full open palm has priority over Dash, with soft thumb geometry and both
  // camera-space and world-space evidence to handle tilted hands.
  if(isFullOpenPalm(p,palm,frameH,world))
    return {kind:'open',direction:ZERO,confidence:1};
  const idx=indexCandidate(p,palm,frameH,world);
  const middle=middleRaised(p,palm,frameH,world);
  const extendedOther=otherFingersOpen(p,world);
  // An open-ish hand cannot be used as an accidental Dash.
  if(idx&&!extendedOther){
    const d=vec(idx.tip,idx.base);
    const direction=length(d)>=frameH*.018?normalize({x:mirrored?-d.x:d.x,y:d.y}):ZERO;
    const target=pointingTarget(idx.tip,idx.base,frameW,frameH,mirrored);
    return {kind:middle?'dash':'point',direction,target,confidence:idx.quality,source:'index'};
  }
  const protruding=length(vec(p[8],p[5]))>=Math.max(frameH*.075,palm*.83);
  if(i<133&&m<133&&r<138&&pink<138&&!protruding)
    return {kind:'fist',direction:ZERO,confidence:1};
  return {kind:'invalid',direction:ZERO,confidence:0};
}

// Time-adaptive, velocity-assisted cursor, not a 140ms gesture-activation gate.
// Fast hand changes get larger alpha. Prediction is capped (no massive jumps
// on a missed frame) and disabled after a gesture discontinuity.
export class GestureSmoother {
  private accepted:GestureSignal={kind:'lost',direction:ZERO,confidence:0};
  private lastRaw:Vector|null=null;
  private lastTarget:Vector|null=null;
  private lastTime:number|null=null;
  private lastValidAt:number|null=null;
  reset(){this.accepted={kind:'lost',direction:ZERO,confidence:0};this.lastRaw=null;this.lastTarget=null;this.lastTime=null;this.lastValidAt=null;}
  update(signal:GestureSignal,now:number):GestureSignal {
    if((signal.kind!=='point'&&signal.kind!=='dash')||!signal.target){
      // A single short occlusion must not blank the target or cause a jump.
      // Do not retain aim on fist, open palm, or actual loss of the whole hand.
      if(signal.kind==='invalid'&&(this.accepted.kind==='point'||this.accepted.kind==='dash')&&this.lastValidAt!==null&&now-this.lastValidAt<=85)
        return {...this.accepted,kind:'point',confidence:this.accepted.confidence*.55};
      this.accepted=signal;this.lastRaw=null;this.lastTarget=null;this.lastTime=null;this.lastValidAt=null;return signal;
    }
    this.lastValidAt=now;
    const raw=signal.target;
    if((this.accepted.kind!=='point'&&this.accepted.kind!=='dash')||!this.lastRaw||!this.lastTarget||this.lastTime===null){
      this.lastRaw={...raw};this.lastTarget={...raw};this.lastTime=now;
      this.accepted=signal;return signal; // Aim immediately: no 140ms acceptance delay.
    }
    const dt=Math.max(.008,Math.min(.15,(now-this.lastTime)/1000));
    const dx=raw.x-this.lastRaw.x,dy=raw.y-this.lastRaw.y;
    const displacement=Math.hypot(dx,dy);
    const alpha=clamp(.57+displacement/180,.57,.93);
    const lead=displacement>=5?Math.min(.025,28/(displacement/dt)) : 0;
    const predicted={x:raw.x+dx/dt*lead,y:raw.y+dy/dt*lead};
    const nextTarget={
      x:clamp(this.lastTarget.x+(predicted.x-this.lastTarget.x)*alpha,DEADZONE,GAME_WIDTH-DEADZONE),
      y:clamp(this.lastTarget.y+(predicted.y-this.lastTarget.y)*alpha,DEADZONE,GAME_HEIGHT-DEADZONE)
    };
    const direction=normalize({
      x:this.accepted.direction.x*(1-alpha)+signal.direction.x*alpha,
      y:this.accepted.direction.y*(1-alpha)+signal.direction.y*alpha
    });
    this.lastRaw={...raw};this.lastTarget=nextTarget;this.lastTime=now;
    this.accepted={...signal,target:nextTarget,direction};
    return this.accepted;
  }
}

// Still deliberately debounced: spreading 5 fingers starts/resumes/restarts.
export class OpenPalmTrigger {
  private openSince:number|null=null;
  private lastOpenAt:number|null=null;
  private releasedSince:number|null=null;
  private armed=true;
  private lastAction=-Infinity;
  private holdMs:number;private releaseMs:number;private cooldownMs:number;private graceMs:number;
  constructor(holdMs=420,releaseMs=240,cooldownMs=900,graceMs=115){
    this.holdMs=holdMs;this.releaseMs=releaseMs;this.cooldownMs=cooldownMs;this.graceMs=graceMs;
  }
  reset(){this.openSince=null;this.lastOpenAt=null;this.releasedSince=null;this.armed=true;this.lastAction=-Infinity;}
  update(kind:GestureKind,now:number):boolean {
    if(kind!=='open'){
      // Record the first non-open frame even during grace. Otherwise two
      // consecutive non-open observations >releaseMs apart wouldn't re-arm.
      if(this.releasedSince===null)this.releasedSince=now;
      if(now-this.releasedSince>=this.releaseMs)this.armed=true;
      // A 30-FPS tracker can occasionally report an 'invalid'/'dash' frame
      // inside a held open palm. Preserve the hold through a brief dropout,
      // but NEVER trigger an action on a non-open frame.
      if(this.openSince!==null&&this.lastOpenAt!==null&&now-this.lastOpenAt<=this.graceMs)return false;
      this.openSince=null;this.lastOpenAt=null;
      return false;
    }
    this.releasedSince=null;
    if(this.openSince===null)this.openSince=now;
    this.lastOpenAt=now;
    if(!this.armed||now-this.openSince<this.holdMs||now-this.lastAction<this.cooldownMs)return false;
    this.armed=false;this.lastAction=now;return true;
  }
}

// Dash fires once per deliberate INDEX + MIDDLE hold; release is required.
export class TwoFingerDashTrigger {
 private start:number|null=null;private releasedAt:number|null=null;private armed=true;
 private holdMs:number;private releaseMs:number;
 constructor(holdMs=120,releaseMs=150){this.holdMs=holdMs;this.releaseMs=releaseMs;}
 reset(){this.start=null;this.releasedAt=null;this.armed=true;}
 update(kind:GestureKind,now:number):boolean {
  if(kind!=='dash'){this.start=null;if(this.releasedAt===null)this.releasedAt=now;if(now-this.releasedAt>=this.releaseMs)this.armed=true;return false;}
  this.releasedAt=null;if(this.start===null)this.start=now;
  if(!this.armed||now-this.start<this.holdMs)return false;
  this.armed=false;return true;
 }
}
