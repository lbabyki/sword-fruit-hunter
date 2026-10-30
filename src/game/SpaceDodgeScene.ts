import Phaser from 'phaser';
import {GAME_WIDTH as W,GAME_HEIGHT as H,length,normalize,steerSwordToTarget,updateSwordMotion,type Vector} from './rules.ts';
import {SPACE_DEFAULTS,normalizeSpaceSettings,spaceSettingsKey,spaceDifficulty,maxMeteors,meteorTrajectory,sweptCircleCollision,boundShipTarget,safeMeteorSpawn,nextSpaceScore,seededSpaceRandom,type SpaceSettings,type SpaceObject,type SpaceStatus,type SpaceScore,type SpacePhase} from './spaceRules.ts';
import type {GameBridge} from './types.ts';
type SpaceBridge=Pick<GameBridge,'getSignal'|'getMode'|'getPlayer'|'playSound'> & {onSpaceStatus:(status:SpaceStatus)=>void;onSpaceFinish:(result:SpaceScore)=>void};
type Keys=Record<string,Phaser.Input.Keyboard.Key>;
export class SpaceDodgeScene extends Phaser.Scene {
 private bridge:SpaceBridge;
 private bg!:Phaser.GameObjects.Graphics;
 private art!:Phaser.GameObjects.Graphics;
 private title?:Phaser.GameObjects.Text;
 private subtitle?:Phaser.GameObjects.Text;
 private keys:Keys={};
 private settings:SpaceSettings={...SPACE_DEFAULTS};
 private phase:SpacePhase='idle';
 private ship:Vector={x:W*.25,y:H/2};
 private priorShip:Vector={...this.ship};
 private velocity:Vector={x:0,y:0};
 private objects:SpaceObject[]=[];
 private id=1;private rng:()=>number=Math.random;
 private lives=3;private stars=0;private score=0;private survival=0;
 private meteorsLeft=0;private starsLeft=0;private immunity=0;private telemetry=.0;
 private lostSince:number|null=null;private interruption=false;
 private competition=false;private hint='Nhấn BẮT ĐẦU hoặc xòe 5 ngón';
 constructor(bridge:SpaceBridge){super({key:'SpaceDodgeScene'});this.bridge=bridge;}
 create(){
  this.cameras.main.setBackgroundColor('#07152B');
  this.bg=this.add.graphics();this.art=this.add.graphics();
  this.title=this.add.text(W/2,H*.42,'',{fontFamily:'Arial',fontSize:'58px',fontStyle:'bold',color:'#D9F6FF'}).setOrigin(.5).setDepth(20);
  this.subtitle=this.add.text(W/2,H*.55,'',{fontFamily:'Arial',fontSize:'21px',color:'#A7D3EA'}).setOrigin(.5).setDepth(20);
  this.keys=(this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE')??{}) as Keys;
  this.drawBackground();this.publish();
 }
 private drawBackground(){
  const g=this.bg;g.fillGradientStyle(0x041329,0x0D2140,0x101C3D,0x07132C,1);g.fillRect(0,0,W,H);
  const r=seededSpaceRandom(82026);
  for(let i=0;i<160;i++){g.fillStyle(i%5?0xB2D8FA:0xF8DE93,.18+r()*.65);g.fillCircle(r()*W,r()*H,.5+r()*1.8);}
  g.fillStyle(0xE9B46C,.04);g.fillRect(W*.82,0,W*.18,H);
  g.lineStyle(2,0x366788,.6);g.strokeRoundedRect(12,12,W-24,H-24,15);
  g.lineStyle(1,0xF9DCA0,.13);g.lineBetween(W*.82,15,W*.82,H-15);
 }
 startGame(competition=false,raw:SpaceSettings=SPACE_DEFAULTS){
  this.settings=normalizeSpaceSettings(raw);this.competition=competition;
  this.rng=competition?seededSpaceRandom(20261030):Math.random;
  this.phase='playing';this.ship={x:W*.25,y:H/2};this.priorShip={...this.ship};this.velocity={x:0,y:0};
  this.objects=[];this.id=1;this.lives=this.settings.lives;this.stars=0;this.score=0;this.survival=0;
  this.immunity=0;this.meteorsLeft=1.3;this.starsLeft=2.6;this.telemetry=0;this.lostSince=null;this.interruption=false;
  this.hint=this.settings.mode==='endless'?'Né thiên thạch, thu thập sao!':'Thu thập sao để đạt mốc điểm!';this.publish();
 }
 pauseGame(){if(this.phase==='playing'){this.phase='paused';this.hint='Tạm dừng';this.publish();}}
 resumeGame(){if(this.phase==='paused'){this.phase='playing';this.lostSince=null;this.hint='Tiếp tục';this.publish();}}
 private keyControl(){
  const key=(...names:string[])=>names.some(n=>this.keys[n]?.isDown);
  const dx=Number(key('D','RIGHT'))-Number(key('A','LEFT'));
  const dy=Number(key('S','DOWN'))-Number(key('W','UP'));
  return {dir:normalize({x:dx,y:dy}),brake:key('SPACE')||(!dx&&!dy)};
 }
 update(_now:number,delta:number){
  const dt=Math.min(Math.max(0,delta/1000),.04);this.draw(dt);
  if(this.phase!=='playing')return;
  if(this.bridge.getMode()==='camera'){
   const signal=this.bridge.getSignal();
   if(signal.kind==='lost'){
    if(this.lostSince===null)this.lostSince=this.survival;
    if(this.survival-this.lostSince>.5){this.interruption=true;this.pauseGame();this.hint='Mất tracking >0.5s';this.publish();return;}
   }else this.lostSince=null;
  }
  this.survival+=dt;this.immunity=Math.max(0,this.immunity-dt);
  this.priorShip={...this.ship};
  if(this.bridge.getMode()==='camera'){
   const sig=this.bridge.getSignal();
   if(sig.kind==='point'&&sig.target){const next=steerSwordToTarget(this.ship,this.velocity,boundShipTarget(sig.target),dt,this.settings.shipSpeed*1.15);this.ship=next.position;this.velocity=next.velocity;}
   else {const next=updateSwordMotion(this.ship,this.velocity,{x:0,y:0},true,dt,this.settings.shipSpeed);this.ship=next.position;this.velocity=next.velocity;}
  }else{
   const input=this.keyControl();const next=updateSwordMotion(this.ship,this.velocity,input.dir,input.brake,dt,this.settings.shipSpeed*1.15);this.ship=next.position;this.velocity=next.velocity;
  }
  this.ship=boundShipTarget(this.ship);
  const difficulty=spaceDifficulty(this.survival,this.settings.progressive);
  this.meteorsLeft-=dt;
  if(this.meteorsLeft<=0){this.spawnMeteor(difficulty);this.meteorsLeft=(1.3+this.rng()*.7)/difficulty;}
  this.starsLeft-=dt;
  if(this.starsLeft<=0){this.spawnStar();this.starsLeft=2.5+this.rng()*1.5;}
  for(const obj of this.objects){obj.previous={...obj.pos};obj.pos={x:obj.pos.x+obj.velocity.x*dt,y:obj.pos.y+obj.velocity.y*dt};}
  const touched=new Set<number>();
  for(const obj of this.objects){
   if(sweptCircleCollision(this.priorShip,this.ship,22,obj.previous,obj.pos,obj.radius)){
    if(obj.kind==='star'){
     touched.add(obj.id);this.stars++;this.score=nextSpaceScore(this.stars);this.bridge.playSound('fruit');this.hint='+100 điểm • Đã thu thập sao';
     if(this.settings.mode==='goal'&&this.score>=this.settings.goal){this.objects=[];this.finish(true);return;}
    }else if(this.immunity<=0){
     touched.add(obj.id);this.lives--;this.immunity=1.2;this.bridge.playSound('bomb');this.cameras.main.shake?.(160,.006,false);
     this.hint='Trúng thiên thạch! −1 mạng';
     if(this.lives<=0){this.objects=[];this.finish(false);return;}
    }
   }
  }
  this.objects=this.objects.filter(o=>!touched.has(o.id)&&o.pos.x>-o.radius-70&&o.pos.y>-o.radius-140&&o.pos.y<H+o.radius+140);
  this.telemetry+=dt;if(this.telemetry>=.095){this.telemetry=0;this.publish();}
 }
 private spawnMeteor(difficulty:number){
  if(this.objects.filter(x=>x.kind==='meteor').length>=maxMeteors(this.survival,this.settings.progressive))return;
  for(let i=0;i<14;i++){
   const path=meteorTrajectory(this.rng,this.settings.meteorSpeed,difficulty);
   if(!safeMeteorSpawn(path,this.objects,this.ship))continue;
   this.objects.push({id:this.id++,kind:'meteor',pos:path.position,previous:{...path.position},velocity:path.velocity,radius:path.radius,route:path.route});return;
  }
 }
 private spawnStar(){
  if(this.objects.filter(x=>x.kind==='star').length>=2)return;
  const y=80+this.rng()*(H-160),x=W+36;
  const candidate={x,y};
  if(this.objects.some(obj=>obj.kind==='meteor'&&Math.hypot(obj.pos.x-x,obj.pos.y-y)<140))return;
  this.objects.push({id:this.id++,kind:'star',pos:candidate,previous:{...candidate},radius:18,velocity:{x:-135,y:0}});
 }
 private finish(completed:boolean){
  if(this.phase!=='playing')return;
  this.phase=completed?'finished':'failed';this.velocity={x:0,y:0};this.objects=[];
  this.hint=completed?'Đạt mốc điểm mục tiêu!':'Đã hết mạng!';
  const result:SpaceScore={id:typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():String(Date.now()),player:this.bridge.getPlayer().trim()||'Người chơi',mode:this.settings.mode,score:this.score,stars:this.stars,survivalSeconds:Number(this.survival.toFixed(2)),livesLeft:this.lives,date:new Date().toISOString(),settingsKey:spaceSettingsKey(this.settings),inputMode:this.bridge.getMode(),qualified:!this.interruption&&this.competition&&this.bridge.getMode()==='camera',completed:this.settings.mode==='endless'||completed};
  this.publish();this.bridge.onSpaceFinish(result);
 }
 private draw(dt:number){
  if(!this.art)return;
  const g=this.art;g.clear();
  for(const obj of this.objects){
   const x=obj.pos.x,y=obj.pos.y;
   if(obj.kind==='meteor'){
    g.fillStyle(0xDEA770,.12);g.fillCircle(x,y,obj.radius+9);
    g.fillStyle(0x77605B,1);g.fillCircle(x,y,obj.radius);
    g.lineStyle(3,0xC6A58B,1);g.strokeCircle(x,y,obj.radius);
    g.fillStyle(0x392D38,.8);g.fillCircle(x-obj.radius*.32,y-obj.radius*.24,obj.radius*.27);g.fillCircle(x+obj.radius*.32,y+obj.radius*.31,obj.radius*.18);
   }else{
    g.fillStyle(0xFDD968,.2);g.fillCircle(x,y,27);
    g.fillStyle(0xFFE17D,1);const pts=[] as Vector[];
    for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?9:20;pts.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r});}
    g.fillPoints(pts,true);g.lineStyle(2,0xFFFFFF,.8);g.strokePoints(pts,true);
   }
  }
  if(this.bridge.getMode()==='camera'){
   const sig=this.bridge.getSignal();if(sig.kind==='point'&&sig.target){const pt=boundShipTarget(sig.target);g.lineStyle(2,0x54EFC0,.65);g.strokeCircle(pt.x,pt.y,16);g.lineStyle(1,0x55F3CD,.18);g.lineBetween(this.ship.x,this.ship.y,pt.x,pt.y);}
  }
  if(this.immunity===0||Math.floor(this.immunity*11)%2===0){
   const a=length(this.velocity)>15?Math.atan2(this.velocity.y,this.velocity.x):0;
   const forward={x:Math.cos(a),y:Math.sin(a)},side={x:-forward.y,y:forward.x};
   const loc=(u:number,v:number):Vector=>({x:this.ship.x+forward.x*u+side.x*v,y:this.ship.y+forward.y*u+side.y*v});
   g.fillStyle(0x46C2F4,.15);g.fillCircle(this.ship.x,this.ship.y,37);
   g.fillStyle(0x77DFFD,1);g.fillPoints([loc(34,0),loc(-16,-22),loc(-8,0),loc(-16,22)],true);
   g.lineStyle(3,0xD5FAFF,1);g.strokePoints([loc(34,0),loc(-16,-22),loc(-8,0),loc(-16,22)],true);
   g.fillStyle(0xF2B46E,.9);g.fillPoints([loc(-17,-8),loc(-35,0),loc(-17,8)],true);
   g.fillStyle(0x286D98,1);g.fillCircle(this.ship.x+forward.x*10,this.ship.y+forward.y*10,7);
  }
  const overlay=this.phase!=='playing';this.title?.setVisible(overlay);this.subtitle?.setVisible(overlay);
  if(overlay){
   const labels={idle:'SPACE DODGE',paused:'TẠM DỪNG',finished:'MISSION COMPLETE',failed:'GAME OVER'};
   this.title?.setText(this.phase==='playing'?'SPACE DODGE':labels[this.phase]);
   this.subtitle?.setText(this.phase==='idle'?'Xòe 5 ngón hoặc nhấn BẮT ĐẦU':this.phase==='paused'?'Xòe 5 ngón để tiếp tục':this.phase==='failed'?'Hết mạng! Xòe tay để chơi lại':'Đạt điểm mục tiêu! Xòe tay để chơi lại');
   g.fillStyle(0x06172B,.68);g.fillRoundedRect(280,240,640,224,18);g.lineStyle(2,0x38768C,.75);g.strokeRoundedRect(280,240,640,224,18);
  }
  void dt;
 }
 private publish(){this.bridge.onSpaceStatus({phase:this.phase,score:this.score,stars:this.stars,lives:this.lives,maxLives:this.settings.lives,survivalSeconds:this.survival,difficulty:spaceDifficulty(this.survival,this.settings.progressive),meteoCount:this.objects.filter(o=>o.kind==='meteor').length,goal:this.settings.goal,mode:this.settings.mode,hint:this.hint});}
}
