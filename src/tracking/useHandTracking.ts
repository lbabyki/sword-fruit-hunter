import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import type {HandLandmarker} from '@mediapipe/tasks-vision';
import {classifyHand,GestureSmoother,type GestureSignal,type HandPoint} from './gestures.ts';
export type TrackerStatus='off'|'loading'|'ready'|'error';
export type HandTracker={
  videoRef:RefObject<HTMLVideoElement|null>;canvasRef:RefObject<HTMLCanvasElement|null>;
  status:TrackerStatus;message:string;signal:GestureSignal;start:()=>Promise<void>;stop:()=>void;
};
const LOST:GestureSignal={kind:'lost',direction:{x:0,y:0},confidence:0};
const WASM=`${import.meta.env.BASE_URL}mediapipe/wasm`.replace(/\/$/, '');
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const EDGES:[number,number][]=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const DETECT_INTERVAL_MS=28; // Throttle with at most one outstanding frame: no backlog.
const UI_UPDATE_MS=110;       // React HUD must not rerender at 30+ FPS.

type WorkerReply={type:'ready'}|{type:'result';points:HandPoint[]|null;worldPoints:HandPoint[]|null;timestamp:number;inferenceMs:number}|{type:'error';message:string};
function drawLandmarks(canvas:HTMLCanvasElement,points:readonly HandPoint[]|null){
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const width=canvas.width,height=canvas.height;ctx.clearRect(0,0,width,height);
  if(!points)return;
  ctx.lineWidth=3;ctx.strokeStyle='#50EAC0';ctx.lineCap='round';
  for(const [a,b] of EDGES){ctx.beginPath();ctx.moveTo(points[a].x*width,points[a].y*height);ctx.lineTo(points[b].x*width,points[b].y*height);ctx.stroke();}
  points.forEach((p,i)=>{ctx.beginPath();ctx.fillStyle=i===8||i===12?'#FFF4A8':'#F4FFFD';ctx.arc(p.x*width,p.y*height,i===8||i===12?6:3,0,Math.PI*2);ctx.fill();});
}
export function useHandTracking(onSignal:(s:GestureSignal)=>void):HandTracker {
  const videoRef=useRef<HTMLVideoElement|null>(null),canvasRef=useRef<HTMLCanvasElement|null>(null);
  const landmarkerRef=useRef<HandLandmarker|null>(null),workerRef=useRef<Worker|null>(null);
  const streamRef=useRef<MediaStream|null>(null),rafRef=useRef<number>(0),activeRef=useRef(false);
  const generationRef=useRef(0),busyRef=useRef(false),lastFrameRef=useRef(-1),lastDetectRef=useRef(0);
  const uiAtRef=useRef(0),smoothRef=useRef(new GestureSmoother());
  const emitRef=useRef(onSignal);emitRef.current=onSignal;
  const [status,setStatus]=useState<TrackerStatus>('off');
  const [message,setMessage]=useState('Camera chưa bật');
  const [signal,setSignal]=useState<GestureSignal>(LOST);
  const emit=useCallback((s:GestureSignal,now=performance.now())=>{
    emitRef.current(s); // Phaser/control and 5-finger gate receive every inference immediately.
    // UI state is telemetry only; updates are throttled and never gate sword motion.
    if(now-uiAtRef.current>=UI_UPDATE_MS||s.kind!==signalKindRef.current){
      uiAtRef.current=now;signalKindRef.current=s.kind;setSignal(s);
    }
  },[]);
  const signalKindRef=useRef<GestureSignal['kind']>('lost');
  const release=useCallback(()=>{
    activeRef.current=false;generationRef.current++;
    cancelAnimationFrame(rafRef.current);workerRef.current?.terminate();workerRef.current=null;
    landmarkerRef.current?.close();landmarkerRef.current=null;
    streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
    if(videoRef.current){videoRef.current.pause();videoRef.current.srcObject=null;}
    if(canvasRef.current)drawLandmarks(canvasRef.current,null);
    busyRef.current=false;lastFrameRef.current=-1;lastDetectRef.current=0;
    smoothRef.current.reset();
  },[]);
  const stop=useCallback(()=>{release();emit(LOST);setStatus('off');setMessage('Camera đã tắt');},[release,emit]);
  const start=useCallback(async()=>{
    if(activeRef.current)return;
    if(!navigator.mediaDevices?.getUserMedia){setStatus('error');setMessage('Webcam cần localhost hoặc HTTPS.');return;}
    activeRef.current=true;const session=++generationRef.current;
    setStatus('loading');setMessage('Đang khởi động AI…');
    const stillActive=()=>activeRef.current&&generationRef.current===session;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30},facingMode:'user'}});
      if(!stillActive()){stream.getTracks().forEach(t=>t.stop());return;}
      streamRef.current=stream;
      const video=videoRef.current;if(!video)throw new Error('Không tìm thấy camera preview');
      video.srcObject=stream;await video.play();if(!stillActive())return;
      if(canvasRef.current){canvasRef.current.width=video.videoWidth;canvasRef.current.height=video.videoHeight;}
      const processResult=(points:HandPoint[]|null,captureAt:number,worldPoints:HandPoint[]|null=null)=>{
        if(!stillActive())return;
        const raw=points?classifyHand(points,video.videoWidth,video.videoHeight,true,worldPoints??undefined):LOST;
        const stable=smoothRef.current.update(raw,captureAt);
        emit({...stable,latencyMs:Math.round(performance.now()-captureAt),observedAtMs:captureAt});
        if(canvasRef.current)drawLandmarks(canvasRef.current,points);
      };
      let useWorker=false;
      let fallbackInProgress=false;
      const startMainThreadFallback=async(reason?:string)=>{
        if(!stillActive()||landmarkerRef.current||fallbackInProgress)return;
        fallbackInProgress=true;useWorker=false;
        workerRef.current?.terminate();workerRef.current=null;busyRef.current=false;
        setMessage(reason?`AI chạy trên luồng chính (worker không khả dụng): ${reason}`:'AI chạy trên luồng chính');
        const {HandLandmarker,FilesetResolver}=await import('@mediapipe/tasks-vision');
        const vision=await FilesetResolver.forVisionTasks(WASM);
        if(!stillActive())return;
        const hand=await HandLandmarker.createFromOptions(vision,{
          baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},runningMode:'VIDEO',numHands:1,
          minHandDetectionConfidence:.49,minHandPresenceConfidence:.48,minTrackingConfidence:.48
        });
        if(!stillActive()){hand.close();return;}
        landmarkerRef.current=hand;setStatus('ready');setMessage('AI sẵn sàng · luồng chính (fallback)');
      };
      if(typeof Worker!=='undefined'&&typeof createImageBitmap==='function'){
        try{
          const worker=new Worker(new URL('./handWorker.ts',import.meta.url),{type:'module'});
          workerRef.current=worker;
          // Worker errors are handled by a fallback, not a permanent lost-camera state.
          worker.onerror=()=>{if(stillActive())void startMainThreadFallback('không thể khởi chạy').catch(fail);};
          worker.onmessage=(event:MessageEvent<WorkerReply>)=>{
            if(!stillActive())return;
            const data=event.data;
            if(data.type==='ready'){useWorker=true;busyRef.current=false;setStatus('ready');setMessage('AI sẵn sàng · xử lý ở worker');}
            else if(data.type==='result'){busyRef.current=false;processResult(data.points,data.timestamp,data.worldPoints);}
            else if(data.type==='error')void startMainThreadFallback(data.message).catch(fail);
          };
          worker.postMessage({type:'init',wasm:WASM,model:MODEL});
        }catch(error){await startMainThreadFallback(error instanceof Error?error.message:'không thể tạo worker');}
      } else await startMainThreadFallback('trình duyệt không hỗ trợ');
      if(!stillActive())return;
      const loop=(now:number)=>{
        if(!stillActive())return;
        // Schedule the next display frame regardless of whether AI inference is in progress.
        rafRef.current=requestAnimationFrame(loop);
        const vid=videoRef.current;
        if(!vid||vid.readyState<2||vid.currentTime===lastFrameRef.current||now-lastDetectRef.current<DETECT_INTERVAL_MS||busyRef.current)return;
        if(!useWorker&&!landmarkerRef.current)return;
        lastFrameRef.current=vid.currentTime;lastDetectRef.current=now;
        if(useWorker&&workerRef.current){
          busyRef.current=true;
          // Never queue frames behind an old inference; display reacts to latest completed frame.
          void createImageBitmap(vid).then(bitmap=>{
            if(!stillActive()||!workerRef.current){bitmap.close();busyRef.current=false;return;}
            try{workerRef.current.postMessage({type:'frame',frame:bitmap,timestamp:now},[bitmap]);}
            catch(error){bitmap.close();busyRef.current=false;void startMainThreadFallback(String(error)).catch(fail);}
          }).catch(error=>{busyRef.current=false;void startMainThreadFallback(String(error)).catch(fail);});
        }else if(landmarkerRef.current){
          try{
            const result=landmarkerRef.current.detectForVideo(vid,now);
            processResult(result.landmarks?.[0]??null,now,result.worldLandmarks?.[0]??null);
          }catch(error){fail(error);}
        }
      };
      const fail=(error:unknown)=>{
        if(!stillActive())return;
        release();setStatus('error');setMessage(error instanceof Error?error.message:String(error));emit(LOST);
      };
      rafRef.current=requestAnimationFrame(loop);
    }catch(error){
      if(!stillActive())return;
      release();setStatus('error');setMessage(error instanceof Error?error.message:'Không thể bật camera hoặc tải mô hình');emit(LOST);
    }
  },[emit,release]);
  useEffect(()=>()=>{release();},[release]);
  return {videoRef,canvasRef,status,message,signal,start,stop};
}
