/**
 * Keep the MediaPipe JS package and its Emscripten WASM loader/binary in sync.
 * Run automatically on npm install, npm run dev, and npm run build.
 * The output is served by Vite at /mediapipe/wasm/...
 */
import {existsSync,mkdirSync,copyFileSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const src=join(root,'node_modules','@mediapipe','tasks-vision','wasm');
const dest=join(root,'public','mediapipe','wasm');
const names=[
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm'
];

export function syncMediaPipeAssets(source=src,destination=dest){
  if(!existsSync(source))throw new Error(`MediaPipe WASM not found: ${source}\nRun npm install in the project directory.`);
  const missing=names.filter(name=>!existsSync(join(source,name)));
  if(missing.length)throw new Error(`MediaPipe package is missing required WASM files: ${missing.join(', ')}. Check @mediapipe/tasks-vision package version.`);
  mkdirSync(destination,{recursive:true});
  for(const name of names)copyFileSync(join(source,name),join(destination,name));
  return names;
}

// Avoid executing this top level when imported from unit tests.
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const packageJson=JSON.parse(readFileSync(join(root,'node_modules','@mediapipe','tasks-vision','package.json'),'utf8'));
    const copied=syncMediaPipeAssets();
    console.log(`MediaPipe ${packageJson.version}: ${copied.length} WASM assets synchronized to public/mediapipe/wasm`);
  }catch(error){
    console.error(error instanceof Error?error.message:error);
    process.exitCode=1;
  }
}
