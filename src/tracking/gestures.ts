import {clamp, length, normalize, GAME_WIDTH, GAME_HEIGHT, type Vector} from '../game/rules.ts';

export type HandPoint = {x:number;y:number;z?:number};
export type GestureKind = 'point'|'open'|'fist'|'invalid'|'lost';
export type GestureSignal = {kind:GestureKind;direction:Vector;confidence:number;target?:Vector;source?:'index'|'middle'|'dual';latencyMs?:number};
const ZERO:Vector={x:0,y:0};
const DEADZONE=55;
// These are intentionally separate so device-specific calibration can be added later.
const VIEW_CROP_X=.10, VIEW_CROP_Y=.09, VIEW_SPAN_X=.80, VIEW_SPAN_Y=.82;
const RAY_GAIN=.27;
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
function pointingCandidate(p:Vector[],mcp:number,pip:number,dip:number,tip:number,name:'index'|'middle',palm:number,frameH:number):Candidate|null {
  const straight=fingerAngle(p,mcp,pip,tip);
  const distalStraight=angle(p[pip],p[dip],p[tip]);
  const reach=length(vec(p[tip],p[mcp]));
  const knuckleLength=length(vec(p[pip],p[mcp]));
  // For edge-on fingers, MCP/PIP/DIP may overlap; use the one visible extended
  // finger. Reject 2-D projections too short to determine a reliable direction.
  const strong=straight>=141 && distalStraight>=131;
  // Oblique / nearly overlapping fingers in the additional 38 reference photos
  // can collapse PIP/DIP on the 2-D projection. Accept one clearly protruding
  // fingertip even when a strict "two straight fingers" test is not satisfied.
  const reachGate=Math.max(frameH*.048,knuckleLength*1.14,palm*.50);
  const foreshortened=reach>=Math.max(frameH*.13,palm*1.27);
  const weak=reach>=reachGate && (straight>=96||distalStraight>=112||foreshortened);
  if(reach<Math.max(frameH*.025,knuckleLength*.96,palm*.27)||(!strong&&!weak))return null;
  const direction=normalize(vec(p[tip],p[mcp]));
  if(length(direction)<.5)return null;
  const projectionQuality=clamp(reach/Math.max(1,palm*1.25),.25,1);
  const quality=strong?clamp(.58+(straight-141)/170+(distalStraight-131)/260,0,1)
    :clamp(.28+projectionQuality*.21+Math.max(0,straight-96)/320,.25,.57);
  return {tip:p[tip],base:p[mcp],direction,quality,name};
}

export function classifyHand(landmarks:readonly HandPoint[],frameW=640,frameH=480,mirrored=true):GestureSignal {
  if(!validPoints(landmarks) || frameW<=0 || frameH<=0) return {kind:'lost',direction:ZERO,confidence:0};
  const p=landmarks.map(point=>projected(point,frameW,frameH));
  const i=fingerAngle(p,5,6,8),m=fingerAngle(p,9,10,12);
  const r=fingerAngle(p,13,14,16),pink=fingerAngle(p,17,18,20);
  const palm=Math.max(1,length(vec(p[5],p[17])));
  const thumbStraight=angle(p[2],p[3],p[4])>148 && angle(p[1],p[2],p[4])>140;
  const thumbSpread=length(vec(p[4],p[5]))>Math.max(12,palm*.72);
  // Full palm must NOT accidentally become a pointing command.
  if(i>153&&m>153&&r>153&&pink>153&&thumbStraight&&thumbSpread)
    return {kind:'open',direction:ZERO,confidence:1};
  // A severely foreshortened pointing finger can have a small joint angle.
  // Its tip still protrudes from the knuckle; do not call that a closed fist.
  const protrudingTip=Math.max(length(vec(p[8],p[5])),length(vec(p[12],p[9])))
    >=Math.max(frameH*.075,palm*.83);
  if(i<133&&m<133&&r<138&&pink<138&&!protrudingTip)
    return {kind:'fist',direction:ZERO,confidence:1};
  // If the other two fingers are clearly open, do not mistake a V-sign or partial
  // open palm for the sword-pointing pose.
  // On side-facing hands MediaPipe can mistake a folded ring or little finger
  // for an extended finger. Reject only when BOTH clearly appear extended;
  // full open palms were already classified above.
  if(r>155&&pink>155)return {kind:'invalid',direction:ZERO,confidence:0};
  const idx=pointingCandidate(p,5,6,7,8,'index',palm,frameH);
  const mid=pointingCandidate(p,9,10,11,12,'middle',palm,frameH);
  if(!idx&&!mid)return {kind:'invalid',direction:ZERO,confidence:0};
  let tip:Vector,base:Vector,source:'index'|'middle'|'dual',confidence:number;
  if(idx&&mid){
    const dot=idx.direction.x*mid.direction.x+idx.direction.y*mid.direction.y;
    const tipSeparation=length(vec(idx.tip,mid.tip));
    if(dot>.82 && tipSeparation<Math.max(1,palm)*1.1) {
      const total=idx.quality+mid.quality;
      const w=idx.quality/total;
      tip={x:idx.tip.x*w+mid.tip.x*(1-w),y:idx.tip.y*w+mid.tip.y*(1-w)};
      base={x:idx.base.x*w+mid.base.x*(1-w),y:idx.base.y*w+mid.base.y*(1-w)};
      source='dual';confidence=clamp((idx.quality+mid.quality)*.56,.60,1);
    }else{
      // An unreliable 'second finger' must not pull the aim off target.
      const preferred=idx.quality>=mid.quality?idx:mid;
      tip=preferred.tip;base=preferred.base;source=preferred.name;confidence=preferred.quality*.83;
    }
  }else{
    const preferred=(idx??mid)!;
    tip=preferred.tip;base=preferred.base;source=preferred.name;confidence=preferred.quality*.89;
  }
  const delta=vec(tip,base);
  if(length(delta)<frameH*.035)return {kind:'invalid',direction:ZERO,confidence:0};
  const direction=normalize({x:mirrored?-delta.x:delta.x,y:delta.y});
  return {kind:'point',direction,target:pointingTarget(tip,base,frameW,frameH,mirrored),confidence,source};
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
    if(signal.kind!=='point'||!signal.target){
      // A single short occlusion must not blank the target or cause a jump.
      // Do not retain aim on fist, open palm, or actual loss of the whole hand.
      if(signal.kind==='invalid'&&this.accepted.kind==='point'&&this.lastValidAt!==null&&now-this.lastValidAt<=85)
        return {...this.accepted,confidence:this.accepted.confidence*.55};
      this.accepted=signal;this.lastRaw=null;this.lastTarget=null;this.lastTime=null;this.lastValidAt=null;return signal;
    }
    this.lastValidAt=now;
    const raw=signal.target;
    if(this.accepted.kind!=='point'||!this.lastRaw||!this.lastTarget||this.lastTime===null){
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
  private releasedSince:number|null=null;
  private armed=true;
  private lastAction=-Infinity;
  private holdMs:number;private releaseMs:number;private cooldownMs:number;
  constructor(holdMs=420,releaseMs=240,cooldownMs=900){this.holdMs=holdMs;this.releaseMs=releaseMs;this.cooldownMs=cooldownMs;}
  reset(){this.openSince=null;this.releasedSince=null;this.armed=true;this.lastAction=-Infinity;}
  update(kind:GestureKind,now:number):boolean {
    if(kind!=='open'){
      this.openSince=null;
      if(this.releasedSince===null)this.releasedSince=now;
      if(now-this.releasedSince>=this.releaseMs)this.armed=true;
      return false;
    }
    this.releasedSince=null;
    if(this.openSince===null)this.openSince=now;
    if(!this.armed || now-this.openSince<this.holdMs || now-this.lastAction<this.cooldownMs)return false;
    this.armed=false;this.lastAction=now;return true;
  }
}
