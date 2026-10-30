/** MediaPipe inference in its own thread to keep Phaser's frame loop responsive. */
import {FilesetResolver,HandLandmarker} from '@mediapipe/tasks-vision';
import type {HandPoint} from './gestures.ts';

type Input={type:'init';wasm:string;model:string}|{type:'frame';frame:ImageBitmap;timestamp:number};
type Output={type:'ready'}|{type:'result';points:HandPoint[]|null;worldPoints:HandPoint[]|null;timestamp:number;inferenceMs:number}|{type:'error';message:string};
const channel=self as unknown as {onmessage:((event:MessageEvent<Input>)=>void)|null;postMessage:(value:Output)=>void};
let landmarker:HandLandmarker|null=null;
let lastTimestamp=-1;
channel.onmessage=async event=>{
  const msg=event.data;
  if(msg.type==='init'){
    try{
      const vision=await FilesetResolver.forVisionTasks(msg.wasm);
      landmarker=await HandLandmarker.createFromOptions(vision,{
        baseOptions:{modelAssetPath:msg.model,delegate:'CPU'},runningMode:'VIDEO',numHands:1,
        minHandDetectionConfidence:.49,minHandPresenceConfidence:.48,minTrackingConfidence:.48
      });
      channel.postMessage({type:'ready'});
    }catch(error){channel.postMessage({type:'error',message:error instanceof Error?error.message:String(error)});}
    return;
  }
  try{
    if(!landmarker||msg.timestamp<=lastTimestamp)return;
    lastTimestamp=msg.timestamp;
    const start=performance.now();
    const result=landmarker.detectForVideo(msg.frame,msg.timestamp);
    const points=result.landmarks?.[0]??null;
    const worldPoints=result.worldLandmarks?.[0]??null;
    channel.postMessage({type:'result',points:points?.map(p=>({x:p.x,y:p.y,z:p.z}))??null,worldPoints:worldPoints?.map(p=>({x:p.x,y:p.y,z:p.z}))??null,timestamp:msg.timestamp,inferenceMs:performance.now()-start});
  }catch(error){channel.postMessage({type:'error',message:error instanceof Error?error.message:String(error)});}
  finally{msg.frame.close();}
};
