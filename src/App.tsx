import {useCallback,useEffect,useRef,useState} from 'react';
import Phaser from 'phaser';
import {SwordFruitScene} from './game/SwordFruitScene.ts';
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
const START:GameStatus={phase:'idle',word:'CAT',stage:1,letterIndex:0,score:0,combo:0,maxCombo:0,comboLeft:0,playSeconds:0,penaltySeconds:0,bombs:0,mistakes:0,sword:{x:600,y:360},hint:'Chọn chế độ và bắt đầu chơi',stageCount:3,collectedIndices:[],unorderedLetters:false,scoreTimeSeconds:50,pointsPerSecond:25};
const LOST:GestureSignal={kind:'lost',direction:{x:0,y:0},confidence:0};
const fmtTime=(sec:number)=>`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}.${Math.floor(sec%1*10)}`;
const fmtScore=(score:number)=>score.toLocaleString('vi-VN',{maximumFractionDigits:2});
const NAME_KEY='sword-fruit:player-name:v1';
function readPlayer(){try{return localStorage.getItem(NAME_KEY)??'';}catch{return '';}}
function SignalLabel({signal}:{signal:GestureSignal}){
  const labels={point:signal.source==='index'?'TRỎ • NHẮM ĐÍCH':signal.source==='middle'?'GIỮA • NHẮM ĐÍCH':'HAI NGÓN • NHẮM ĐÍCH',open:'XÒE 5 NGÓN • XÁC NHẬN',fist:'NẮM TAY • HÃM KIẾM',invalid:'CHƯA XÁC ĐỊNH NGÓN CHỈ',lost:'CHƯA THẤY BÀN TAY'};
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
  const [finishedResult,setFinishedResult]=useState<RankResult|null>(null);
  const [showHelp,setShowHelp]=useState(false);
  const signalRef=useRef<GestureSignal>(LOST),modeRef=useRef<InputMode>(mode),playerRef=useRef(player);
  const openTriggerRef=useRef(new OpenPalmTrigger());
  const stateRef=useRef<{phase:GamePhase;cameraReady:boolean;competition:boolean;helpOpen:boolean}>({phase:status.phase,cameraReady:false,competition,helpOpen:false});
  modeRef.current=mode;playerRef.current=player;
  stateRef.current.phase=status.phase;stateRef.current.competition=competition;stateRef.current.helpOpen=showHelp||showSettings;
  const onSignal=useCallback((signal:GestureSignal)=>{
    signalRef.current=signal;
    if(!openTriggerRef.current.update(signal.kind,performance.now()))return;
    const state=stateRef.current;
    if(modeRef.current!=='camera'||!state.cameraReady||state.helpOpen||!playerRef.current.trim())return;
    const scene=sceneRef.current;if(!scene)return;
    if(state.phase==='idle'||state.phase==='finished'){
      setLastResult(null);setFinishedResult(null);scene.startGame(state.competition,settingsRef.current);
    }else if(state.phase==='paused')scene.resumeGame();
    // Opening the palm during normal gameplay or intermission does nothing.
  },[]);
  const tracker=useHandTracking(onSignal);
  stateRef.current.cameraReady=tracker.status==='ready';
  useEffect(()=>{try{localStorage.setItem(NAME_KEY,player);}catch{/* blocked */}},[player]);
  const saveSettings=useCallback((next:GameSettings)=>{setSettings(next);settingsRef.current=next;audioRef.current?.setEnabled(next.soundEnabled);if(next.soundEnabled)audioRef.current?.unlock();try{persistSettings(next);}catch{/* blocked */}},[]);
  const openSettings=useCallback(()=>{if(stateRef.current.phase==='between')return;sceneRef.current?.pauseGame();setShowSettings(true);},[]);
  const completedRef=useRef<(result:RankResult)=>void>(()=>{});
  completedRef.current=(r)=>{
    try{saveResult(r);}catch { /* private mode / disabled localStorage */ }
    setResults(readResults());setFinishedResult(r);setLastResult(r);
  };
  useEffect(()=>{
    if(!hostRef.current)return;
    const scene=new SwordFruitScene({
      onStatus:s=>setStatus(s),onFinish:r=>completedRef.current(r),
      getSignal:()=>signalRef.current,getMode:()=>modeRef.current,getPlayer:()=>playerRef.current,
      playSound:effect=>audioRef.current?.play(effect)
    });
    sceneRef.current=scene;
    const game=new Phaser.Game({type:Phaser.AUTO, parent:hostRef.current, width:1200,height:720,
      backgroundColor:'#07152B',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
      render:{antialias:true,pixelArt:false},scene:[scene],fps:{target:60,forceSetTimeOut:false}});
    gameRef.current=game;
    const onVisibility=()=>{if(document.hidden)scene.pauseGame();};
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{document.removeEventListener('visibilitychange',onVisibility);game.destroy(true);gameRef.current=null;sceneRef.current=null;};
  },[]);
  useEffect(()=>{
    // Effect setup/cleanup is repeated by React StrictMode in development.
    // Re-create the audio engine on each setup instead of reusing a disposed instance.
    const manager=new GameAudio(settingsRef.current.soundEnabled);
    audioRef.current=manager;
    return ()=>{audioRef.current=null;manager.dispose();};
  },[]);
  useEffect(()=>{
    if(status.phase==='playing'&&mode==='camera'&&tracker.status==='error')sceneRef.current?.pauseGame();
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
  const isActive=['playing','between','paused'].includes(status.phase);
  const cameraRequired=mode==='camera'&&tracker.status!=='ready';
  const canStart=!cameraRequired && Boolean(player.trim());
  const restart=()=>{
    setLastResult(null);setFinishedResult(null);
    if(cameraRequired)return;
    sceneRef.current?.startGame(competition,settingsRef.current);
  };
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
        <div className="brand-logo">⚔</div>
        <div><div className="brand-title">SWORD<span>FRUIT</span></div><div className="brand-sub">WORD HUNTER <i>·</i> AI GESTURE ARCADE</div></div>
      </div>
      <div className="header-right"><span className="version">PROTOTYPE V1.5</span><span className="online-dot"/><span className="online-label">LOCAL SESSION</span></div>
    </header>
    <div className="content">
      <div className="intro"><div><span className="eyebrow">INTERACTIVE ARCADE EXPERIENCE</span><h1>Điều khiển <em>phi kiếm.</em> Chinh phục từ ngữ.</h1><p>Dùng vị trí đầu ngón trỏ hoặc giữa để đưa kiếm tới điểm ngắm; thu thập chữ cái và nối combo.</p></div><button className="help-btn" onClick={()=>setShowHelp(true)}>ⓘ &nbsp; HƯỚNG DẪN</button></div>
      <div className="layout game-workspace" ref={workspaceRef}>
        <main className="main-pane">
          <div className="game-topline">
            <div className="chapter"><span className="live-pulse"/> MISSION {Math.min(status.stage,status.stageCount).toString().padStart(2,'0')} <span className="sep">/</span> {String(status.stageCount).padStart(2,'0')}</div>
            <div className="word-difficulty">{status.stage===1?'WARM UP':status.stage===2?'WORD QUEST':status.stage>=status.stageCount?'FINAL CHALLENGE':'WORD CHALLENGE'}</div>
            <div className="mission-label">WORD COLLECTION</div>
            <button className="fullscreen-toggle settings-top-button" type="button" onClick={openSettings} disabled={status.phase==='between'}>⚙ CÀI ĐẶT</button>
            <button className="fullscreen-toggle" type="button" onClick={()=>void toggleFullscreen()} aria-pressed={isFullscreen} title={isFullscreen?'Thoát toàn màn hình (Esc)':'Chỉ hiện khung game và HUD ở toàn màn hình'}>{isFullscreen?'⤢ THOÁT TOÀN MÀN HÌNH':'⛶ TOÀN MÀN HÌNH'}</button>
          </div>
          <div className="word-banner"><span className="banner-label">TỪ CẦN HOÀN THÀNH</span><div className="letter-row">{status.word.split('').map((letter,i)=><div key={`${status.stage}-${i}`} className={`letter-tile ${status.collectedIndices.includes(i)?'collected':''} ${!unorderedActive&&i===status.letterIndex&&status.phase!=='finished'?'next':''}`}>{letter}</div>)}</div><div className="letter-counter"><b>{Math.min(status.letterIndex,status.word.length)}</b><span> / {status.word.length}</span></div></div>
          <div className="arena-frame">
            <div className="arena-fade"/>
            <div className="game-host" ref={hostRef} aria-label="Màn chơi chém chữ"/>
            <div className="arena-tag arena-tag-left"><span className="tag-laser"/> LIVE ARENA</div>
            <div className="arena-tag arena-tag-right">TARGET · <b>{unorderedActive?'TỰ DO':status.word[status.letterIndex]??'—'}</b></div>
            <div className="arena-hint">{status.hint}</div>
          </div>
          {fullscreenError&&<div className="fullscreen-warning" role="alert">Không thể mở toàn màn hình: {fullscreenError}</div>}
          <div className="game-controls">
            <div className="controls-left">
              {status.phase==='playing'||status.phase==='between'?<button className="secondary-btn" onClick={()=>sceneRef.current?.pauseGame()} disabled={status.phase==='between'}>Ⅱ &nbsp; TẠM DỪNG</button>:
               status.phase==='paused'?<button className="primary-btn" onClick={()=>sceneRef.current?.resumeGame()}>▶ &nbsp; TIẾP TỤC</button>:
               <button className="primary-btn" onClick={restart} disabled={!canStart}>⚔ &nbsp; {status.phase==='finished'?'CHƠI LƯỢT MỚI':'BẮT ĐẦU CHƠI'}</button>}
              {isActive&&<button className="ghost-btn" onClick={()=>{sceneRef.current?.startGame(competition,settingsRef.current);setLastResult(null);setFinishedResult(null);}}>↻ CHƠI LẠI</button>}
            </div>
            <label className="player-inline"><span>TÊN NGƯỜI CHƠI</span><input aria-label="Tên người chơi" value={player} maxLength={24} onChange={e=>setPlayer(e.target.value)} placeholder="Nhập tên người chơi..." disabled={isActive}/></label>
            <div className="control-legend"><span className="circle-status"/>{mode==='camera'?'FINGERTIP 1–2 NGÓN · LOW LATENCY':'DEMO · WASD / PHÍM MŨI TÊN'}</div>
          </div>
          <div className="settings-grid">

            <div className="setting-item"><span>CHẾ ĐỘ ĐIỀU KHIỂN</span><div className="pill-switch"><button className={mode==='camera'?'selected':''} onClick={()=>{setMode('camera');}} disabled={isActive}>◉ AI CAMERA</button><button className={mode==='keyboard'?'selected':''} onClick={()=>{setMode('keyboard');setCompetition(false);}} disabled={isActive}>⌨ BÀN PHÍM</button></div></div>
            <div className="setting-item challenge-setting"><span>CHẾ ĐỘ THI ĐẤU</span><label className="toggle"><input type="checkbox" checked={competition} onChange={e=>setCompetition(e.target.checked)} disabled={isActive||mode==='keyboard'}/><span className="track"/><span>{competition?'SEED CỐ ĐỊNH':'LUYỆN TẬP'}</span></label></div>
          </div>
          <div className="notice-line">{mode==='camera'?'Nhắm bằng hai ngón hoặc một ngón trỏ/giữa khi ngón còn lại bị khuất. Kiếm bay tới dấu +. Xòe năm ngón để bắt đầu, tiếp tục hoặc chơi lại.':'Chế độ bàn phím chỉ phục vụ thử nghiệm, không được tính là kết quả thi đấu chính thức.'}</div>
        </main>
        <aside className="sidebar">
          <section className="dashboard panel"><div className="section-head"><div><span className="eyebrow">LIVE TELEMETRY</span><h2>Thống kê lượt chơi</h2></div><span className="stats-icon">◈</span></div>
            <div className="time-tile"><div><span className="stat-label">THỜI GIAN XẾP HẠNG</span><div className="time-value">{fmtTime(rankTime)}</div></div><span className="stopwatch">◷</span></div>
            <div className="score-tile"><span className="stat-label">{status.phase==='finished'?'ĐIỂM KẾT':'ĐIỂM GỐC ĐANG CÓ'}</span><div className="score-value">{fmtScore(displayedScore)}<small>PTS</small></div><div className="score-projection">{status.phase==='finished'?`Thưởng thời gian: ${fmtScore(finishedResult?.timeBonus??finishTimeBonus(rankTime,shownScoreTime,shownRate))}`:`Điểm kết tạm tính: ${fmtScore(predictedFinal)}`}</div></div>
            <div className="combo-card"><div className="combo-head"><span>⚡ COMBO CHAIN</span><strong>x{status.combo}</strong></div><div className="combo-track"><div className="combo-fill" style={{width:`${comboPct}%`,background:comboPct<30?'#FF865F':'#70E7BE'}}/></div><div className="combo-footer"><span>MAX COMBO <b>x{status.maxCombo}</b></span><span>{status.comboLeft.toFixed(1)}s</span></div></div>
            <div className="tiny-stats"><div><span>☄ &nbsp; BOM</span><strong>{status.bombs}<small> × 5s</small></strong></div><div><span>✕ &nbsp; CHÉM SAI</span><strong>{status.mistakes}</strong></div></div>
          </section>
          <section className="camera-panel panel"><div className="section-head compact"><div><span className="eyebrow">HAND TRACKING</span><h2>Camera AI</h2></div><span className={`camera-indicator ${tracker.status==='ready'?'indicator-ready':''}`}>{tracker.status==='ready'?'● ACTIVE':tracker.status==='loading'?'◌ LOADING':'● OFFLINE'}</span></div>
            <div className="camera-view"><video ref={tracker.videoRef} muted playsInline autoPlay/><canvas ref={tracker.canvasRef} width={640} height={480}/>{tracker.status!=='ready'&&<div className="camera-empty"><div className="hand-illustration">☞</div><span>{tracker.status==='loading'?'AI ĐANG KHỞI ĐỘNG':'CAMERA PREVIEW'}</span></div>}<div className="video-corner lefttop"/><div className="video-corner righttop"/><div className="video-corner leftbottom"/><div className="video-corner rightbottom"/></div>
            <div className="tracking-foot"><SignalLabel signal={tracker.signal}/><span className="tracking-dot"/></div>
            {tracker.signal.kind==='point'&&tracker.signal.target&&<small className="aim-coordinates">ĐÍCH: {Math.round(tracker.signal.target.x)}, {Math.round(tracker.signal.target.y)} · TRỄ XỬ LÝ ~{tracker.signal.latencyMs??'–'}ms</small>}
            <small className="camera-message">{tracker.message}</small>
            <button className={`camera-toggle ${tracker.status==='ready'?'cam-off':'cam-on'}`} onClick={()=>tracker.status==='ready'||tracker.status==='loading'?tracker.stop():void tracker.start()}>{tracker.status==='ready'?'■ TẮT CAMERA':tracker.status==='loading'?'✕ HỦY KHỞI ĐỘNG':'◉ BẬT CAMERA AI'}</button>
          </section>
          <section className="ranking-panel panel"><div className="section-head compact"><div><span className="eyebrow">HALL OF FAME</span><h2>Top 5 người chơi</h2></div><span className="trophy-icon">🏆</span></div>
            <div className="leader-tabs"><button className={leaderTab==='score'?'active':''} onClick={()=>setLeaderTab('score')}>✦ ĐIỂM CAO</button><button className={leaderTab==='time'?'active':''} onClick={()=>setLeaderTab('time')}>◷ NHANH NHẤT</button></div>
            <Leaderboard results={qualifiedResults} mode={leaderTab}/>
            <div className="rank-mode">{competition?'BẢNG THI ĐẤU · AI CAMERA':'BẢNG LUYỆN TẬP · '+(mode==='camera'?'AI CAMERA':'BÀN PHÍM')} · {settingsKey(settings)==='classic-v1.3'?'MẶC ĐỊNH':'CẤU HÌNH RIÊNG'}</div>
          </section>
        </aside>
        {showSettings&&<GameSettingsScreen initial={settings} activeRound={isActive} onSave={saveSettings} onClose={closeSettings}/>}
        {lastResult&&!showSettings&&<ResultDialog result={lastResult} onAgain={restart} onClose={()=>setLastResult(null)}/>}
      </div>
      <footer className="footer"><span>SWORD FRUIT / WORD HUNTER</span><span>{3+extraWordLengths(settings.extraLetters).length} CHẶNG · {15+settings.extraLetters} CHỮ · 1 PHI KIẾM</span><span>TỐI ĐA ĐIỂM CHÉM {fmtScore(theoreticalMaxScore(settings.extraLetters))} PTS</span></footer>
    </div>
    {showHelp&&<div className="help-overlay" role="dialog" aria-modal="true"><div className="help-dialog"><button className="help-close" onClick={()=>setShowHelp(false)}>✕</button><span className="eyebrow">HOW TO PLAY</span><h2>Hướng dẫn điều khiển</h2><div className="help-content"><p><b>1. Bật camera AI:</b> Cho phép trình duyệt truy cập webcam, giữ bàn tay trong khung hình.</p><p><b>2. Di chuyển kiếm:</b> Dùng ngón trỏ và/hoặc ngón giữa chỉ vào vùng camera. Đầu ngón tạo điểm ngắm và hướng ngón giúp dịch nhẹ điểm đích; khi một ngón bị khuất hệ thống ưu tiên ngón còn nhận diện được. Di chuyển hoặc xoay ngón để điều khiển dấu ngắm. Kiếm bay tới dấu ngắm theo vận tốc/quán tính, không dịch chuyển tức thời đến vị trí bàn tay.</p><p><b>3. Bắt đầu / tiếp tục / chơi lại:</b> Xòe cả 5 ngón, giữ ổn định khoảng nửa giây. Phải khép tay lại rồi mới xòe tiếp để kích hoạt lần nữa. Khi đang chơi, xòe tay chỉ hãm kiếm và không khởi động lại ván.</p><p><b>4. Hãm kiếm:</b> Nắm tay lại. Nếu mất tracking trên 0,5 giây, game tạm dừng.</p><p><b>5. Thu thập chữ:</b> Mặc định chém theo thứ tự trong 3 từ (3 → 5 → 7); có thể bật thu thập chữ bất kỳ hoặc thêm các từ trong màn hình cài đặt. Chém sai hoặc bom làm mất combo; bom cộng thêm 5 giây.</p><p><b>6. Chơi thử bàn phím:</b> WASD hoặc phím mũi tên di chuyển; SPACE hãm kiếm. Đây không phải chế độ thi đấu.</p><p><b>7. Combo:</b> 3,5 giây cho mỗi chữ đúng liên tiếp; 100 điểm nền và +25 điểm cho mỗi cấp combo.</p><p><b>8. Điểm kết:</b> Điểm gốc + (mốc thời gian − thời gian xếp hạng) × điểm mỗi giây. Mốc 50 giây mặc định chỉ dùng tính điểm, KHÔNG kết thúc ván. Bảng top 5 phân chia theo cấu hình.</p><p><b>9. Âm thanh:</b> Âm thanh chém quả, nổ bom và nhấn nút có thể bật/tắt tại Cài đặt màn chơi. Âm thanh được kích hoạt khi bạn tương tác với ứng dụng, theo quy định của trình duyệt.</p><p><b>10. Toàn màn hình:</b> Nhấn TOÀN MÀN HÌNH ở thanh phía trên màn chơi. Chỉ hiển thị game cùng bảng thống kê, camera, bảng xếp hạng; nhấn Esc để thoát.</p></div><button className="primary-btn" onClick={()=>setShowHelp(false)}>ĐÃ HIỂU</button></div></div>}
  </div>;
}
