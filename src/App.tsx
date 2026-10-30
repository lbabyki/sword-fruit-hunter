import {useCallback,useEffect,useRef,useState} from 'react';
import Phaser from 'phaser';
import {SwordFruitScene} from './game/SwordFruitScene.ts';
import {SpaceDodgeScene} from './game/SpaceDodgeScene.ts';
import {spaceSettingsKey,topSpaceScores,type SpaceSettings,type SpaceStatus,type SpaceScore} from './game/spaceRules.ts';
import {loadSpaceSettings,saveSpaceSettings,readSpaceScores,saveSpaceScore,loadSpaceCalibration,saveSpaceCalibration,applySpaceCalibration,type SpaceCalibration} from './game/spaceStorage.ts';
import {SpaceSettingsScreen} from './components/SpaceSettingsScreen.tsx';
import type {GamePhase,GameStatus,InputMode} from './game/types.ts';
import type {RankResult} from './game/rules.ts';
import {COMBO_SECONDS,theoreticalMaxScore,finishTimeBonus,finalScore} from './game/rules.ts';
import {getTopScores,getTopTimes,readResults,saveResult} from './game/storage.ts';
import {useHandTracking} from './tracking/useHandTracking.ts';
import {OpenPalmTrigger,type GestureSignal} from './tracking/gestures.ts';
import {GameSettingsScreen} from './components/GameSettingsScreen.tsx';
import {GameAudio} from './audio/GameAudio.ts';
import {loadSettings,persistSettings,settingsKey,extraWordLengths,type GameSettings} from './game/settings.ts';
import './styles.css';
const START:GameStatus={phase:'idle',word:'CAT',stage:1,letterIndex:0,score:0,combo:0,maxCombo:0,comboLeft:0,playSeconds:0,penaltySeconds:0,bombs:0,bombGameOver:false,bombLimit:3,mistakes:0,sword:{x:600,y:360},hint:'Chọn chế độ và bắt đầu chơi',stageCount:3,collectedIndices:[],unorderedLetters:false,scoreTimeSeconds:50,pointsPerSecond:25};
const SPACE_START:SpaceStatus={phase:'idle',score:0,stars:0,lives:3,maxLives:3,survivalSeconds:0,difficulty:1,meteoCount:0,goal:1000,mode:'endless',hint:'Chọn chế độ và bắt đầu',dashReady:false,dashActive:false,dashCooldown:0,shield:0,starCombo:0,nearMisses:0,dashUses:0,warning:false};
const LOST:GestureSignal={kind:'lost',direction:{x:0,y:0},confidence:0};
const fmtTime=(sec:number)=>`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}.${Math.floor(sec%1*10)}`;
const fmtScore=(score:number)=>score.toLocaleString('vi-VN',{maximumFractionDigits:2});
const NAME_KEY='sword-fruit:player-name:v1';
function readPlayer(){try{return localStorage.getItem(NAME_KEY)??'';}catch{return '';}}
function SignalLabel({signal}:{signal:GestureSignal}){
  const labels={point:'NGÓN TRỎ • NHẮM ĐÍCH',open:'XÒE 5 NGÓN • XÁC NHẬN',fist:'NẮM TAY • HÃM KIẾM',dash:'TRỎ + GIỮA • DASH',invalid:'CHƯA XÁC ĐỊNH NGÓN CHỈ',lost:'CHƯA THẤY BÀN TAY'};
  return <span className={`gesture-message gesture-${signal.kind}`}>{labels[signal.kind]}</span>;
}
function Leaderboard({results,mode}:{results:RankResult[];mode:'score'|'time'}){
  const list=mode==='score'?getTopScores(results):getTopTimes(results);
  return <div className="leaders-list">
    {list.length===0?<div className="empty-board"><span>◇</span><p>Chưa có kỷ lục</p><small>Hoàn thành màn chơi để ghi tên vào bảng.</small></div>:list.map((r,i)=><div className="leader-row" key={r.id}>
      <span className={`place place-${i+1}`}>{['Ⅰ','Ⅱ','Ⅲ','4','5'][i]}</span>
      <div className="leader-name"><strong title={r.player}>{r.player}</strong><small>{r.words.join(' · ')}</small></div>
      <span className="leader-value">{mode==='score'?fmtScore(r.score):`${r.rankSeconds.toFixed(1)}s`}</span>
    </div>)}
  </div>;
}
function ResultDialog({result,onAgain,onClose}:{result:RankResult;onAgain:()=>void;onClose:()=>void}){
  return <div className="result-backdrop" role="dialog" aria-modal="true" aria-label="Kết quả lượt chơi">
    <div className="result-dialog">
      <div className="result-symbol">✦</div>
      <div className="eyebrow">MISSION COMPLETE · {result.words.length} WORDS</div>
      <h2>HOÀN THÀNH!</h2>
      <p className="result-sub">Tuyệt vời, {result.player}! Bạn đã hoàn thành {result.completedLetters??result.words.join('').length} chữ cái.</p>
      <div className="result-words">{result.words.map((w,i)=><span key={w}><small>CHẶNG {String(i+1).padStart(2,'0')}</small>{w}</span>)}</div>
      <div className="result-grid">
        <div><small>ĐIỂM KẾT THÚC</small><strong>{fmtScore(result.score)}</strong></div>
        <div><small>THỜI GIAN XẾP HẠNG</small><strong>{result.rankSeconds.toFixed(1)}s</strong></div>
        <div><small>COMBO CAO NHẤT</small><strong>x{result.maxCombo}</strong></div>
        <div><small>BOM / CHÉM SAI</small><strong>{result.bombHits} / {result.wrongHits}</strong></div>
      </div>
      <p className="result-formula">Điểm gốc <strong>{fmtScore(result.baseScore??result.score)}</strong> + (({result.scoreTimeSeconds??50} − {result.rankSeconds.toFixed(2)}) × {result.pointsPerSecond??25}) = <strong>{fmtScore(result.score)} điểm</strong> <span>· Thưởng thời gian: {result.timeBonus!==undefined&&result.timeBonus>0?'+':''}{fmtScore(result.timeBonus??0)}</span></p>
      <p className="result-foot">Thời gian chơi: {result.playSeconds.toFixed(1)}s · Phạt bom: +{result.penaltySeconds}s · {result.fairMode?'Kết quả thi đấu hợp lệ':result.mode==='keyboard'?'Lượt chơi thử bằng bàn phím':'Chế độ luyện tập / tracking gián đoạn'}</p>
      <div className="result-actions"><button className="primary-btn" onClick={onAgain}>↻ CHƠI LẠI</button><button className="secondary-btn" onClick={onClose}>XEM BẢNG XẾP HẠNG</button></div>
    </div>
  </div>;
}
export default function App(){
  const hostRef=useRef<HTMLDivElement|null>(null);
  const workspaceRef=useRef<HTMLDivElement|null>(null);
  const gameRef=useRef<Phaser.Game|null>(null);
  const [isFullscreen,setFullscreen]=useState(false);
  const [fullscreenError,setFullscreenError]=useState('');
  const sceneRef=useRef<SwordFruitScene|null>(null);
  const spaceSceneRef=useRef<SpaceDodgeScene|null>(null);
  const [gameType,setGameType]=useState<'fruit'|'space'>('fruit');
  const gameTypeRef=useRef<'fruit'|'space'>('fruit');
  const [spaceStatus,setSpaceStatus]=useState<SpaceStatus>(SPACE_START);
  const [spaceSettings,setSpaceSettings]=useState<SpaceSettings>(loadSpaceSettings);
  const [spaceCalibration,setSpaceCalibration]=useState<SpaceCalibration|null>(loadSpaceCalibration);
  const calibrationRef=useRef<SpaceCalibration|null>(spaceCalibration);calibrationRef.current=spaceCalibration;
  const spaceSettingsRef=useRef<SpaceSettings>(spaceSettings);spaceSettingsRef.current=spaceSettings;
  const [spaceScores,setSpaceScores]=useState<SpaceScore[]>(readSpaceScores);
  const [lastSpaceResult,setLastSpaceResult]=useState<SpaceScore|null>(null);
  const [status,setStatus]=useState<GameStatus>(START);
  const [mode,setMode]=useState<InputMode>('camera');
  const [competition,setCompetition]=useState(false);
  const [player,setPlayer]=useState(readPlayer);
  const [settings,setSettings]=useState<GameSettings>(loadSettings);
  const audioRef=useRef<GameAudio|null>(null);
  const settingsRef=useRef<GameSettings>(settings);
  settingsRef.current=settings;
  const [showSettings,setShowSettings]=useState(false);
  const closeSettings=useCallback(()=>setShowSettings(false),[]);
  const [leaderTab,setLeaderTab]=useState<'score'|'time'>('score');
  const [results,setResults]=useState<RankResult[]>(()=>readResults());
  const [lastResult,setLastResult]=useState<RankResult|null>(null);
  const [failureResult,setFailureResult]=useState<RankResult|null>(null);
  const [finishedResult,setFinishedResult]=useState<RankResult|null>(null);
  const [showHelp,setShowHelp]=useState(false);
  const rawSignalRef=useRef<GestureSignal>(LOST);
  const signalRef=useRef<GestureSignal>(LOST),modeRef=useRef<InputMode>(mode),playerRef=useRef(player);
  const openTriggerRef=useRef(new OpenPalmTrigger());
  const stateRef=useRef<{phase:GamePhase;cameraReady:boolean;competition:boolean;helpOpen:boolean}>({phase:status.phase,cameraReady:false,competition,helpOpen:false});
  modeRef.current=mode;playerRef.current=player;
  stateRef.current.phase=gameType==='fruit'?status.phase:spaceStatus.phase;stateRef.current.competition=competition;stateRef.current.helpOpen=showHelp||showSettings;
  const onSignal=useCallback((signal:GestureSignal)=>{
    rawSignalRef.current=signal;
    signalRef.current=gameTypeRef.current==='space'&&signal.target?{...signal,target:applySpaceCalibration(signal.target,calibrationRef.current)}:signal;
    if(!openTriggerRef.current.update(signal.kind,performance.now()))return;
    const state=stateRef.current;
    if(modeRef.current!=='camera'||!state.cameraReady||state.helpOpen||!playerRef.current.trim())return;
    const scene=gameTypeRef.current==='fruit'?sceneRef.current:spaceSceneRef.current;if(!scene)return;
    if(state.phase==='idle'||state.phase==='finished'||state.phase==='failed'){
      setLastResult(null);setFailureResult(null);setFinishedResult(null);setLastSpaceResult(null);
      if(gameTypeRef.current==='fruit')sceneRef.current?.startGame(state.competition,settingsRef.current);
      else spaceSceneRef.current?.startGame(state.competition,spaceSettingsRef.current);
    }else if(state.phase==='paused')scene.resumeGame();
    // Opening the palm during normal gameplay or intermission does nothing.
  },[]);
  const tracker=useHandTracking(onSignal);
  stateRef.current.cameraReady=tracker.status==='ready';
  useEffect(()=>{try{localStorage.setItem(NAME_KEY,player);}catch{/* blocked */}},[player]);
  const saveSettings=useCallback((next:GameSettings)=>{setSettings(next);settingsRef.current=next;audioRef.current?.setEnabled(next.soundEnabled);if(next.soundEnabled)audioRef.current?.unlock();try{persistSettings(next);}catch{/* blocked */}},[]);
  const openSettings=useCallback(()=>{if(stateRef.current.phase==='between')return; if(gameTypeRef.current==='fruit')sceneRef.current?.pauseGame();else spaceSceneRef.current?.pauseGame();setShowSettings(true);},[]);
  const saveSpaceConfig=useCallback((next:SpaceSettings,sound:boolean)=>{setSpaceSettings(next);spaceSettingsRef.current=next;audioRef.current?.setVolume(next.soundVolume);try{saveSpaceSettings(next);}catch{/* blocked */}saveSettings({...settingsRef.current,soundEnabled:sound});},[saveSettings]);
  const completedRef=useRef<(result:RankResult)=>void>(()=>{});
  completedRef.current=(r)=>{
    try{saveResult(r);}catch { /* private mode / disabled localStorage */ }
    setResults(readResults());setFinishedResult(r);setLastResult(r);
  };
  useEffect(()=>{
    if(!hostRef.current)return;
    const scene=new SwordFruitScene({
      onStatus:s=>setStatus(s),onFinish:r=>completedRef.current(r),onFailure:r=>{setFailureResult(r);setLastResult(null);setFinishedResult(null);},
      getSignal:()=>signalRef.current,getMode:()=>modeRef.current,getPlayer:()=>playerRef.current,
      playSound:effect=>audioRef.current?.play(effect)
    });
    sceneRef.current=scene;
    const spaceScene=new SpaceDodgeScene({
      onSpaceStatus:s=>setSpaceStatus(s),
      onSpaceFinish:r=>{if(r.completed){try{saveSpaceScore(r);}catch{/* private mode */}setSpaceScores(readSpaceScores());}setLastSpaceResult(r);},
      getSignal:()=>signalRef.current,getMode:()=>modeRef.current,getPlayer:()=>playerRef.current,
      playSound:effect=>audioRef.current?.play(effect)
    });
    spaceSceneRef.current=spaceScene;
    const game=new Phaser.Game({type:Phaser.AUTO, parent:hostRef.current, width:1200,height:720,
      backgroundColor:'#07152B',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
      render:{antialias:true,pixelArt:false},scene:[scene,spaceScene],fps:{target:60,forceSetTimeOut:false}});
    gameRef.current=game;
    const onVisibility=()=>{if(document.hidden){scene.pauseGame();spaceScene.pauseGame();}};
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{document.removeEventListener('visibilitychange',onVisibility);game.destroy(true);gameRef.current=null;sceneRef.current=null;spaceSceneRef.current=null;};
  },[]);
  useEffect(()=>{
    // Effect setup/cleanup is repeated by React StrictMode in development.
    // Re-create the audio engine on each setup instead of reusing a disposed instance.
    const manager=new GameAudio(settingsRef.current.soundEnabled);
    audioRef.current=manager;manager.setVolume(gameTypeRef.current==='space'?spaceSettingsRef.current.soundVolume:100);
    return ()=>{audioRef.current=null;manager.dispose();};
  },[]);
  useEffect(()=>{
    if(mode==='camera'&&tracker.status==='error'){if(gameTypeRef.current==='fruit')sceneRef.current?.pauseGame();else spaceSceneRef.current?.pauseGame();}
  },[tracker.status,status.phase,mode]);
  useEffect(()=>{
    const onChange=()=>{
      setFullscreen(document.fullscreenElement===workspaceRef.current);
      requestAnimationFrame(()=>gameRef.current?.scale.refresh());
    };
    document.addEventListener('fullscreenchange',onChange);
    const observer=typeof ResizeObserver!=='undefined'&&hostRef.current?new ResizeObserver(()=>gameRef.current?.scale.refresh()):null;
    if(observer&&hostRef.current)observer.observe(hostRef.current);
    return ()=>{document.removeEventListener('fullscreenchange',onChange);observer?.disconnect();};
  },[]);
  const toggleFullscreen=async()=>{
    setFullscreenError('');
    try {
      if(document.fullscreenElement===workspaceRef.current)await document.exitFullscreen();
      else if(workspaceRef.current)await workspaceRef.current.requestFullscreen();
    }catch(error){setFullscreenError(error instanceof Error?error.message:'Trình duyệt không hỗ trợ chế độ toàn màn hình');}
  };
  const phase=gameType==='fruit'?status.phase:spaceStatus.phase;
  const isActive=['playing','between','paused'].includes(phase);
  const changeGame=(next:'fruit'|'space')=>{
    if(next===gameTypeRef.current||isActive)return;
    setLastResult(null);setFailureResult(null);setLastSpaceResult(null);setFinishedResult(null);
    const game=gameRef.current;
    if(game){game.scene.stop(gameTypeRef.current==='fruit'?'SwordFruitScene':'SpaceDodgeScene');game.scene.start(next==='fruit'?'SwordFruitScene':'SpaceDodgeScene');}
    gameTypeRef.current=next;audioRef.current?.setVolume(next==='space'?spaceSettingsRef.current.soundVolume:100);setGameType(next);
  }; 
  const cameraRequired=mode==='camera'&&tracker.status!=='ready';
  const canStart=!cameraRequired && Boolean(player.trim());
  const restart=()=>{
    setLastResult(null);setFailureResult(null);setFinishedResult(null);setLastSpaceResult(null);
    if(cameraRequired)return;
    if(gameType==='fruit')sceneRef.current?.startGame(competition,settingsRef.current);
    else spaceSceneRef.current?.startGame(competition,spaceSettingsRef.current);
  };
  const spaceQualified=topSpaceScores(spaceScores.filter(r=>r.qualified===competition&&(competition||r.inputMode===mode)),spaceSettings.mode,spaceSettingsKey(spaceSettings));
  const qualifiedResults=results.filter(r=>r.fairMode===competition && (competition || r.mode===mode) && (r.settingsKey??'classic-v1.3')===settingsKey(settings));
  const comboPct=status.combo>0?Math.round(status.comboLeft/COMBO_SECONDS*100):0;
  const rankTime=status.playSeconds+status.penaltySeconds;
  const shownScoreTime=status.phase==='idle'?settings.scoreTimeSeconds:status.scoreTimeSeconds;
  const shownRate=status.phase==='idle'?settings.pointsPerSecond:status.pointsPerSecond;
  const unorderedActive=status.phase==='idle'?settings.unorderedLetters:status.unorderedLetters;
  const predictedFinal=finalScore(status.score,Number(rankTime.toFixed(2)),shownScoreTime,shownRate);
  const displayedScore=status.phase==='finished'&&finishedResult?finishedResult.score:status.score;
  const playButtonSound=useCallback((event:React.MouseEvent<HTMLDivElement>)=>{
    const target=event.target;
    if(target instanceof Element && target.closest('button:not(:disabled)')){
      audioRef.current?.unlock();
      audioRef.current?.play('button');
    }
  },[]);
  return <div className="app-shell" onClickCapture={playButtonSound}>
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo">{gameType==='fruit'?'⚔':'🚀'}</div>
        <div><div className="brand-title">{gameType==='fruit'?<>SWORD<span>FRUIT</span></>:<>SPACE<span>DODGE</span></>}</div><div className="brand-sub">{gameType==='fruit'?'WORD HUNTER':'METEOR SURVIVAL'} <i>·</i> AI GESTURE ARCADE</div></div>
      </div>
      <div className="header-right"><span className="version">PROTOTYPE V2.2</span><span className="online-dot"/><span className="online-label">LOCAL SESSION</span></div>
    </header>
    <div className="content">
      <div className="intro"><div><span className="eyebrow">INTERACTIVE ARCADE EXPERIENCE</span><h1>Điều khiển <em>phi kiếm.</em> Né thiên thạch.</h1><p>Hai chế độ dùng chung AI nhận diện đầu ngón tay, bảng xếp hạng và điều khiển độ trễ thấp.</p></div><button className="help-btn" onClick={()=>setShowHelp(true)}>ⓘ &nbsp; HƯỚNG DẪN</button></div>
      <div className="layout game-workspace" ref={workspaceRef}>
        <main className="main-pane">
          <div className="arcade-mode-selector" role="group" aria-label="Chọn trò chơi"><button className={gameType==='fruit'?'selected':''} disabled={isActive} onClick={()=>changeGame('fruit')}>⚔ SWORD FRUIT</button><button className={gameType==='space'?'selected':''} disabled={isActive} onClick={()=>changeGame('space')}>🚀 SPACE DODGE</button></div>
          <div className="game-topline">
            {gameType==='fruit'?<><div className="chapter"><span className="live-pulse"/> MISSION {Math.min(status.stage,status.stageCount).toString().padStart(2,'0')} <span className="sep">/</span> {String(status.stageCount).padStart(2,'0')}</div>
            <div className="word-difficulty">{status.stage===1?'WARM UP':status.stage===2?'WORD QUEST':status.stage>=status.stageCount?'FINAL CHALLENGE':'WORD CHALLENGE'}</div>
            <div className="mission-label">WORD COLLECTION</div></>:<><div className="chapter"><span className="live-pulse"/> SPACE DODGE</div><div className="word-difficulty">{spaceStatus.mode==='endless'?'ENDLESS SURVIVAL':'SCORE CHALLENGE'}</div><div className="mission-label">METEOR DODGE</div></>}
            <button className="fullscreen-toggle settings-top-button" type="button" onClick={openSettings} disabled={phase==='between'}>⚙ CÀI ĐẶT</button>
            <button className="fullscreen-toggle" type="button" onClick={()=>void toggleFullscreen()} aria-pressed={isFullscreen} title={isFullscreen?'Thoát toàn màn hình (Esc)':'Chỉ hiện khung game và HUD ở toàn màn hình'}>{isFullscreen?'⤢ THOÁT TOÀN MÀN HÌNH':'⛶ TOÀN MÀN HÌNH'}</button>
          </div>
          {gameType==='fruit'?<div className="word-banner"><span className="banner-label">TỪ CẦN HOÀN THÀNH</span><div className="letter-row">{status.word.split('').map((letter,i)=><div key={`${status.stage}-${i}`} className={`letter-tile ${status.collectedIndices.includes(i)?'collected':''} ${!unorderedActive&&i===status.letterIndex&&status.phase!=='finished'?'next':''}`}>{letter}</div>)}</div><div className="letter-counter"><b>{Math.min(status.letterIndex,status.word.length)}</b><span> / {status.word.length}</span></div></div>:<div className="word-banner space-banner"><span className="banner-label">{spaceStatus.mode==='goal'?'ĐIỂM MỤC TIÊU':'SINH TỒN VÔ TẬN'}</span><div className="space-banner-inner"><strong>🚀 {spaceStatus.lives}/{spaceStatus.maxLives} MẠNG</strong><span>★ {spaceStatus.stars} SAO</span><span>{spaceStatus.shield?'🛡 SHIELD':''}</span><span>{spaceSettings.dashEnabled?(spaceStatus.dashActive?'⚡ DASH!':spaceStatus.dashReady?'⚡ SẴN SÀNG':`⚡ ${spaceStatus.dashCooldown.toFixed(1)}s`):''}</span></div><div className="letter-counter">{spaceStatus.mode==='goal'?`${spaceStatus.score}/${spaceStatus.goal}`:`${Math.floor(spaceStatus.survivalSeconds)}s`}</div></div>}
          <div className="arena-frame">
            <div className="arena-fade"/>
            <div className="game-host" ref={hostRef} aria-label={gameType==='fruit'?'Màn chơi chém chữ':'Màn chơi phi thuyền né thiên thạch'}/>
            <div className="arena-tag arena-tag-left"><span className="tag-laser"/> LIVE ARENA</div>
            <div className="arena-tag arena-tag-right">{gameType==='fruit'?<>TARGET · <b>{unorderedActive?'TỰ DO':status.word[status.letterIndex]??'—'}</b></>:<>METEORS · <b>{spaceStatus.meteoCount}</b></>}</div>
            <div className="arena-hint">{gameType==='fruit'?status.hint:spaceStatus.hint}</div>
          </div>
          {fullscreenError&&<div className="fullscreen-warning" role="alert">Không thể mở toàn màn hình: {fullscreenError}</div>}
          <div className="game-controls">
            <div className="controls-left">
              {phase==='playing'||phase==='between'?<button className="secondary-btn" onClick={()=>gameType==='fruit'?sceneRef.current?.pauseGame():spaceSceneRef.current?.pauseGame()} disabled={phase==='between'}>Ⅱ &nbsp; TẠM DỪNG</button>:
               phase==='paused'?<button className="primary-btn" onClick={()=>gameType==='fruit'?sceneRef.current?.resumeGame():spaceSceneRef.current?.resumeGame()}>▶ &nbsp; TIẾP TỤC</button>:
               <button className="primary-btn" onClick={restart} disabled={!canStart}>⚔ &nbsp; {phase==='finished'||phase==='failed'?'CHƠI LƯỢT MỚI':'BẮT ĐẦU CHƠI'}</button>}
              {isActive&&<button className="ghost-btn" onClick={()=>{if(gameType==='fruit')sceneRef.current?.startGame(competition,settingsRef.current);else spaceSceneRef.current?.startGame(competition,spaceSettingsRef.current);setLastResult(null);setFailureResult(null);setFinishedResult(null);setLastSpaceResult(null);}}>↻ CHƠI LẠI</button>}
            </div>
            <label className="player-inline"><span>TÊN NGƯỜI CHƠI</span><input aria-label="Tên người chơi" value={player} maxLength={24} onChange={e=>setPlayer(e.target.value)} placeholder="Nhập tên người chơi..." disabled={isActive}/></label>
            <div className="control-legend"><span className="circle-status"/>{mode==='camera'?'NGÓN TRỎ · LOW LATENCY':'DEMO · WASD / PHÍM MŨI TÊN'}</div>
          </div>
          <div className="settings-grid">

            <div className="setting-item"><span>CHẾ ĐỘ ĐIỀU KHIỂN</span><div className="pill-switch"><button className={mode==='camera'?'selected':''} onClick={()=>{setMode('camera');}} disabled={isActive}>◉ AI CAMERA</button><button className={mode==='keyboard'?'selected':''} onClick={()=>{setMode('keyboard');setCompetition(false);}} disabled={isActive}>⌨ BÀN PHÍM</button></div></div>
            <div className="setting-item challenge-setting"><span>CHẾ ĐỘ THI ĐẤU</span><label className="toggle"><input type="checkbox" checked={competition} onChange={e=>setCompetition(e.target.checked)} disabled={isActive||mode==='keyboard'}/><span className="track"/><span>{competition?'SEED CỐ ĐỊNH':'LUYỆN TẬP'}</span></label></div>
          </div>
          <div className="notice-line">{gameType==='space'?'Chỉ ngón trỏ để lái phi thuyền; giơ thêm ngón giữa để Dash (khi bật). Né thiên thạch, thu thập sao và khiên.':mode==='camera'?'Chỉ ngón trỏ để di chuyển kiếm tới dấu ngắm. Giơ thêm ngón giữa vẫn giữ điểm ngắm ngón trỏ. Xòe 5 ngón để bắt đầu/tiếp tục/chơi lại.':'Chế độ bàn phím chỉ phục vụ thử nghiệm, không được tính là kết quả thi đấu chính thức.'}</div>
        </main>
        <aside className="sidebar">
          {gameType==='fruit'?<section className="dashboard panel"><div className="section-head"><div><span className="eyebrow">LIVE TELEMETRY</span><h2>Thống kê lượt chơi</h2></div><span className="stats-icon">◈</span></div>
            <div className="time-tile"><div><span className="stat-label">THỜI GIAN XẾP HẠNG</span><div className="time-value">{fmtTime(rankTime)}</div></div><span className="stopwatch">◷</span></div>
            <div className="score-tile"><span className="stat-label">{status.phase==='finished'?'ĐIỂM KẾT':'ĐIỂM GỐC ĐANG CÓ'}</span><div className="score-value">{fmtScore(displayedScore)}<small>PTS</small></div><div className="score-projection">{status.phase==='finished'?`Thưởng thời gian: ${fmtScore(finishedResult?.timeBonus??finishTimeBonus(rankTime,shownScoreTime,shownRate))}`:`Điểm kết tạm tính: ${fmtScore(predictedFinal)}`}</div></div>
            <div className="combo-card"><div className="combo-head"><span>⚡ COMBO CHAIN</span><strong>x{status.combo}</strong></div><div className="combo-track"><div className="combo-fill" style={{width:`${comboPct}%`,background:comboPct<30?'#FF865F':'#70E7BE'}}/></div><div className="combo-footer"><span>MAX COMBO <b>x{status.maxCombo}</b></span><span>{status.comboLeft.toFixed(1)}s</span></div></div>
            <div className="tiny-stats"><div><span>☄ &nbsp; BOM</span><strong>{status.bombs}<small>{status.bombGameOver?` / ${status.bombLimit} an toàn`:' × 5s'}</small></strong></div><div><span>✕ &nbsp; CHÉM SAI</span><strong>{status.mistakes}</strong></div></div>
          </section>
          :<section className="dashboard panel"><div className="section-head"><div><span className="eyebrow">LIVE TELEMETRY</span><h2>Chỉ số phi thuyền</h2></div><span className="stats-icon">🚀</span></div><div className="time-tile"><div><span className="stat-label">THỜI GIAN SINH TỒN</span><div className="time-value">{fmtTime(spaceStatus.survivalSeconds)}</div></div></div><div className="score-tile"><span className="stat-label">TỔNG ĐIỂM SAO</span><div className="score-value">{fmtScore(spaceStatus.score)}<small>PTS</small></div></div><div className="combo-card"><div className="combo-head"><span>♥ MẠNG</span><strong>{spaceStatus.lives}/{spaceStatus.maxLives}</strong></div><div className="combo-track"><div className="combo-fill" style={{width:`${100*spaceStatus.lives/spaceStatus.maxLives}%`}}/></div><div className="combo-footer"><span>★ {spaceStatus.stars} SAO · COMBO x{spaceStatus.starCombo}</span><span>ĐỘ KHÓ {spaceStatus.difficulty.toFixed(2)}×</span></div></div><div className="tiny-stats"><div><span>☄ THIÊN THẠCH</span><strong>{spaceStatus.meteoCount}</strong></div><div><span>◎ MỤC TIÊU</span><strong>{spaceStatus.mode==='goal'?spaceStatus.goal:'∞'}</strong></div><div><span>⚡ DASH</span><strong>{spaceSettings.dashEnabled?(spaceStatus.dashReady?'READY':`${spaceStatus.dashCooldown.toFixed(1)}s`):'TẮT'}</strong></div><div><span>✧ NEAR MISS</span><strong>{spaceStatus.nearMisses}</strong></div></div></section>}
          <section className="camera-panel panel"><div className="section-head compact"><div><span className="eyebrow">HAND TRACKING</span><h2>Camera AI</h2></div><span className={`camera-indicator ${tracker.status==='ready'?'indicator-ready':''}`}>{tracker.status==='ready'?'● ACTIVE':tracker.status==='loading'?'◌ LOADING':'● OFFLINE'}</span></div>
            <div className="camera-view"><video ref={tracker.videoRef} muted playsInline autoPlay/><canvas ref={tracker.canvasRef} width={640} height={480}/>{tracker.status!=='ready'&&<div className="camera-empty"><div className="hand-illustration">☞</div><span>{tracker.status==='loading'?'AI ĐANG KHỞI ĐỘNG':'CAMERA PREVIEW'}</span></div>}<div className="video-corner lefttop"/><div className="video-corner righttop"/><div className="video-corner leftbottom"/><div className="video-corner rightbottom"/></div>
            <div className="tracking-foot"><SignalLabel signal={tracker.signal}/><span className="tracking-dot"/></div>
            {(tracker.signal.kind==='point'||tracker.signal.kind==='dash')&&tracker.signal.target&&<small className="aim-coordinates">ĐÍCH: {Math.round(tracker.signal.target.x)}, {Math.round(tracker.signal.target.y)} · TRỄ XỬ LÝ ~{tracker.signal.latencyMs??'–'}ms</small>}
            <small className="camera-message">{tracker.message}</small>
            <button className={`camera-toggle ${tracker.status==='ready'?'cam-off':'cam-on'}`} onClick={()=>tracker.status==='ready'||tracker.status==='loading'?tracker.stop():void tracker.start()}>{tracker.status==='ready'?'■ TẮT CAMERA':tracker.status==='loading'?'✕ HỦY KHỞI ĐỘNG':'◉ BẬT CAMERA AI'}</button>
          </section>
          <section className="ranking-panel panel"><div className="section-head compact"><div><span className="eyebrow">HALL OF FAME</span><h2>Top 5 người chơi</h2></div><span className="trophy-icon">🏆</span></div>
            {gameType==='fruit'&&<div className="leader-tabs"><button className={leaderTab==='score'?'active':''} onClick={()=>setLeaderTab('score')}>✦ ĐIỂM CAO</button><button className={leaderTab==='time'?'active':''} onClick={()=>setLeaderTab('time')}>◷ NHANH NHẤT</button></div>}
            {gameType==='fruit'?<Leaderboard results={qualifiedResults} mode={leaderTab}/>:<div className="leaders-list">{spaceQualified.length?spaceQualified.map((r,i)=><div className="leader-row" key={r.id}><span className={`place place-${i+1}`}>{i+1}</span><div className="leader-name"><strong>{r.player}</strong><small>{r.stars} sao · {r.livesLeft} mạng</small></div><span className="leader-value">{spaceSettings.mode==='endless'?fmtScore(r.score):`${r.survivalSeconds.toFixed(1)}s`}</span></div>):<div className="empty-board"><p>Chưa có kỷ lục Space Dodge</p></div>}</div>}
            <div className="rank-mode">{gameType==='fruit'?(competition?'BẢNG THI ĐẤU · AI CAMERA':'BẢNG LUYỆN TẬP · '+(mode==='camera'?'AI CAMERA':'BÀN PHÍM'))+' · '+(settingsKey(settings)==='classic-v1.3'?'MẶC ĐỊNH':'CẤU HÌNH RIÊNG'):spaceSettings.mode.toUpperCase()+' · TOP 5 RIÊNG'}</div>
          </section>
        </aside>
        {showSettings&&(gameType==='fruit'?<GameSettingsScreen initial={settings} activeRound={isActive} onSave={saveSettings} onClose={closeSettings}/>:<SpaceSettingsScreen initial={spaceSettings} activeRound={isActive} soundEnabled={settings.soundEnabled} onSave={saveSpaceConfig} onClose={closeSettings} calibration={spaceCalibration} onCalibration={v=>{setSpaceCalibration(v);calibrationRef.current=v;try{saveSpaceCalibration(v);}catch{/* browser storage */}}} getTarget={()=>(rawSignalRef.current.kind==='point'||rawSignalRef.current.kind==='dash')?rawSignalRef.current.target??null:null}/>)}
        {failureResult&&!showSettings&&gameType==='fruit'&&<div className="result-backdrop" role="dialog" aria-modal="true"><div className="result-dialog"><div className="result-symbol">☄</div><h2>GAME OVER</h2><p className="result-sub">{failureResult.player} đã vượt số lần nổ bom được phép.</p><div className="result-grid"><div><small>BOM ĐÃ TRÚNG</small><strong>{failureResult.bombHits}</strong></div><div><small>ĐIỂM ĐẠT ĐƯỢC</small><strong>{fmtScore(failureResult.score)}</strong></div></div><p className="result-foot">Lượt thất bại không ghi bảng xếp hạng.</p><div className="result-actions"><button className="primary-btn" onClick={restart}>↻ CHƠI LẠI</button><button className="secondary-btn" onClick={()=>setFailureResult(null)}>ĐÓNG</button></div></div></div>}
        {lastSpaceResult&&!showSettings&&gameType==='space'&&<div className="result-backdrop" role="dialog" aria-modal="true"><div className="result-dialog"><div className="result-symbol">{lastSpaceResult.completed?'★':'☄'}</div><h2>{lastSpaceResult.completed?'KẾT THÚC LƯỢT!':'GAME OVER'}</h2><p className="result-sub">{lastSpaceResult.player} · {lastSpaceResult.mode==='endless'?'Endless Survival':'Score Challenge'}</p><div className="result-grid"><div><small>ĐIỂM</small><strong>{fmtScore(lastSpaceResult.score)}</strong></div><div><small>THỜI GIAN</small><strong>{lastSpaceResult.survivalSeconds.toFixed(1)}s</strong></div><div><small>SAO ĐÃ LẤY</small><strong>{lastSpaceResult.stars}</strong></div><div><small>MẠNG CÒN LẠI</small><strong>{lastSpaceResult.livesLeft}</strong></div></div><div className="result-actions"><button className="primary-btn" onClick={restart}>↻ CHƠI LẠI</button><button className="secondary-btn" onClick={()=>setLastSpaceResult(null)}>ĐÓNG</button></div></div></div>}
        {lastResult&&!showSettings&&gameType==='fruit'&&<ResultDialog result={lastResult} onAgain={restart} onClose={()=>setLastResult(null)}/>}
      </div>
      <footer className="footer"><span>{gameType==='fruit'?'SWORD FRUIT / WORD HUNTER':'SPACE DODGE / METEOR SURVIVAL'}</span>{gameType==='fruit'?<><span>{3+extraWordLengths(settings.extraLetters).length} CHẶNG · {15+settings.extraLetters} CHỮ · 1 PHI KIẾM</span><span>TỐI ĐA ĐIỂM CHÉM {fmtScore(theoreticalMaxScore(settings.extraLetters))} PTS</span></>:<><span>CHẾ ĐỘ {spaceSettings.mode.toUpperCase()}</span><span>SAO +{spaceSettings.starPoints} ĐIỂM · {spaceSettings.lives} MẠNG</span></>}</footer>
    </div>
    {showHelp&&<div className="help-overlay" role="dialog" aria-modal="true"><div className="help-dialog"><button className="help-close" onClick={()=>setShowHelp(false)}>✕</button><span className="eyebrow">HOW TO PLAY</span><h2>Hướng dẫn điều khiển · {gameType==='fruit'?'Sword Fruit':'Space Dodge'}</h2><div className="help-content">{gameType==='space'?<><p><b>1. Điều khiển phi thuyền:</b> Bật webcam, sử dụng duy nhất đầu ngón trỏ để nhắm điểm đến. Phi thuyền bay tới điểm ngắm có quán tính. Nắm tay để hãm.</p><p><b>2. Bắt đầu và chơi lại:</b> Xòe đủ năm ngón hoặc dùng nút điều khiển. Có thể chơi thử bằng WASD và các phím mũi tên.</p><p><b>3. Thiên thạch:</b> Bay từ phải qua trái theo đường ngang và hai góc chéo. Chạm thiên thạch mất một mạng, sau đó miễn nhiễm 1,2 giây.</p><p><b>4. Sao:</b> Chạm sao nhận 100 điểm. Endless kết thúc khi hết mạng; Score Challenge thắng khi đạt mốc điểm, thua nếu hết mạng trước.</p><p><b>5. Dash:</b> Trong Settings bật Dash, giơ thêm ngón giữa cùng ngón trỏ khoảng 120ms để lao theo hướng ngắm gần nhất; hồi chiêu mặc định 3 giây. Dùng Shift ở chế độ bàn phím.</p><p><b>6. Gameplay mở rộng:</b> Bật thiên thạch lớn, cụm, phân tách, Meteor Wave, combo sao, Risk Star, Near Miss và Shield trong Settings.</p><p><b>7. Cài đặt:</b> Chỉnh số mạng, vật lý, quỹ đạo, sao, kỹ năng; có preset Easy–Extreme, Custom và hiệu chuẩn điểm ngắm 2D. Bảng Top 5 riêng theo cấu hình.</p></>:<><p><b>1. Bật camera AI:</b> Cho phép trình duyệt truy cập webcam, giữ bàn tay trong khung hình.</p><p><b>2. Di chuyển kiếm:</b> Dùng ngón trỏ chỉ vào vùng camera. Chỉ đầu ngón trỏ tạo điểm ngắm; ngón giữa không điều khiển vị trí và chỉ dùng để kích hoạt Dash trong Space Dodge. Di chuyển hoặc xoay ngón để điều khiển dấu ngắm. Kiếm bay tới dấu ngắm theo vận tốc/quán tính, không dịch chuyển tức thời đến vị trí bàn tay.</p><p><b>3. Bắt đầu / tiếp tục / chơi lại:</b> Xòe cả 5 ngón, giữ ổn định khoảng nửa giây. Phải khép tay lại rồi mới xòe tiếp để kích hoạt lần nữa. Khi đang chơi, xòe tay chỉ hãm kiếm và không khởi động lại ván.</p><p><b>4. Hãm kiếm:</b> Nắm tay lại. Nếu mất tracking trên 0,5 giây, game tạm dừng.</p><p><b>5. Thu thập chữ:</b> Mặc định chém theo thứ tự trong 3 từ (3 → 5 → 7); có thể bật thu thập chữ bất kỳ hoặc thêm các từ trong màn hình cài đặt. Chém sai hoặc bom làm mất combo; bom cộng thêm 5 giây.</p><p><b>6. Chơi thử bàn phím:</b> WASD hoặc phím mũi tên di chuyển; SPACE hãm kiếm. Đây không phải chế độ thi đấu.</p><p><b>7. Combo:</b> 3,5 giây cho mỗi chữ đúng liên tiếp; 100 điểm nền và +25 điểm cho mỗi cấp combo.</p><p><b>8. Điểm kết:</b> Điểm gốc + (mốc thời gian − thời gian xếp hạng) × điểm mỗi giây. Mốc 50 giây mặc định chỉ dùng tính điểm, KHÔNG kết thúc ván. Bảng top 5 phân chia theo cấu hình.</p><p><b>9. Âm thanh:</b> Âm thanh chém quả, nổ bom và nhấn nút có thể bật/tắt tại Cài đặt màn chơi. Âm thanh được kích hoạt khi bạn tương tác với ứng dụng, theo quy định của trình duyệt.</p><p><b>10. Toàn màn hình:</b> Nhấn TOÀN MÀN HÌNH ở thanh phía trên màn chơi. Chỉ hiển thị game cùng bảng thống kê, camera, bảng xếp hạng; nhấn Esc để thoát.</p></>}</div><button className="primary-btn" onClick={()=>setShowHelp(false)}>ĐÃ HIỂU</button></div></div>}
  </div>;
}
