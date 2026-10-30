import {useEffect,useState,type ReactNode} from 'react';
import {SPACE_DEFAULTS,applySpacePreset,normalizeSpaceSettings,type SpaceSettings,type SpacePreset} from '../game/spaceRules.ts';
import {loadSpaceProfiles,storeSpaceProfile,deleteSpaceProfile,type NamedSpaceProfile,type SpaceCalibration} from '../game/spaceStorage.ts';
type Props={initial:SpaceSettings;activeRound:boolean;soundEnabled:boolean;onSave:(next:SpaceSettings,sound:boolean)=>void;onClose:()=>void;calibration:SpaceCalibration|null;onCalibration:(v:SpaceCalibration|null)=>void;getTarget:()=>{x:number;y:number}|null};
type Tab='mode'|'meteors'|'ship'|'stars'|'skills'|'ai'|'effects';
const TABS:{id:Tab;text:string}[]=[{id:'mode',text:'🎮 Luật chơi'},{id:'meteors',text:'☄ Thiên thạch'},{id:'ship',text:'🚀 Phi thuyền'},{id:'stars',text:'★ Sao & điểm'},{id:'skills',text:'⚡ Kỹ năng'},{id:'ai',text:'✋ Điều khiển AI'},{id:'effects',text:'♫ Hiệu ứng'}];
export function SpaceSettingsScreen({initial,activeRound,soundEnabled,onSave,onClose,calibration,onCalibration,getTarget}:Props){
 const [draft,setDraft]=useState<SpaceSettings>(()=>normalizeSpaceSettings(initial));const [sound,setSound]=useState(soundEnabled);
 const [tab,setTab]=useState<Tab>('mode');const [saved,setSaved]=useState(false);
 const [preset,setPreset]=useState<SpacePreset>('Custom');const [profiles,setProfiles]=useState<NamedSpaceProfile[]>(loadSpaceProfiles);
 const [profileName,setProfileName]=useState('');const [calFirst,setCalFirst]=useState<{x:number;y:number}|null>(null);const [calMessage,setCalMessage]=useState('');
 const patch=<K extends keyof SpaceSettings>(k:K,v:SpaceSettings[K])=>{setDraft(s=>normalizeSpaceSettings({...s,[k]:v}));setPreset('Custom');setSaved(false);};
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();onClose();}};window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);},[onClose]);
 const commit=(next:SpaceSettings)=>{const normalized=normalizeSpaceSettings(next);if(normalized.mode==='goal'&&!normalized.starsEnabled&&!normalized.nearMiss){setTab('stars');setCalMessage('Phải bật sao hoặc Near Miss để chế độ Score Challenge có thể đạt điểm.');return;}onSave(normalized,sound);setDraft(normalized);setSaved(true);};
 const field=(name:string,help:string,content:ReactNode)=> <label className="gs-field"><span><b>{name}</b>{help&&<small>{help}</small>}</span>{content}</label>;
 const slider=(key:keyof SpaceSettings,name:string,min:number,max:number,step:number,help='',suffix='')=>field(name,help,<div className="gs-range"><input type="range" min={min} max={max} step={step} value={draft[key] as number} onChange={e=>patch(key,Number(e.target.value) as never)}/><output>{draft[key]}{suffix}</output></div>);
 const toggle=(key:keyof SpaceSettings,name:string,help='')=><label className="gs-field gs-switch-field"><span><b>{name}</b>{help&&<small>{help}</small>}</span><input type="checkbox" checked={draft[key] as boolean} onChange={e=>patch(key,e.target.checked as never)}/></label>;
 const choosePreset=(name:SpacePreset)=>{setPreset(name);if(name!=='Custom'){setDraft(applySpacePreset(name,draft));setSaved(false);}};
 const saveProfile=()=>{if(!profileName.trim())return;try{setProfiles(storeSpaceProfile(profileName,draft));setProfileName('');setSaved(false);}catch{setCalMessage('Không thể lưu cấu hình trên trình duyệt này.');}};
 const reset=()=>{const d=normalizeSpaceSettings(SPACE_DEFAULTS);setDraft(d);setSound(true);setPreset('Normal');onSave(d,true);setSaved(true);};
 const capture=()=>{const t=getTarget();if(!t){setCalMessage('Bật AI CAMERA và chỉ ngón trỏ / giữa vào điểm được yêu cầu.');return;}
  if(!calFirst){setCalFirst(t);setCalMessage('Đã lấy điểm trên-trái. Chỉ vào điểm DƯỚI-PHẢI rồi nhấn GHI ĐIỂM 2.');}
  else {const v={upperLeft:calFirst,lowerRight:t};if(t.x-calFirst.x<120||t.y-calFirst.y<90){setCalMessage('Hai điểm quá gần hoặc ngược chiều. Hãy thử lại.');setCalFirst(null);return;}onCalibration(v);setCalFirst(null);setCalMessage('Hiệu chuẩn đã lưu. Điểm ngắm được điều chỉnh từ khung tiếp theo.');}
 };
 return <div className="game-settings-overlay" role="dialog" aria-modal="true" aria-labelledby="space-settings-title"><section className="game-settings-page space-advanced-page">
  <div className="gs-header"><div><span className="eyebrow">SPACE DODGE · V2.2</span><h2 id="space-settings-title">Tùy chỉnh Space Dodge</h2><p>Preset và kỹ năng nâng cao · lưu cài đặt để áp dụng cho lượt chơi mới.</p></div><button className="gs-close" onClick={onClose} aria-label="Đóng cài đặt">✕</button></div>
  {activeRound&&<div className="gs-notice">Lượt hiện tại đang tạm dừng. Tùy chỉnh độ khó chỉ có hiệu lực khi bắt đầu lượt mới.</div>}
  <nav className="space-tabs" aria-label="Nhóm cài đặt">{TABS.map(t=><button key={t.id} type="button" className={tab===t.id?'active':''} onClick={()=>setTab(t.id)}>{t.text}</button>)}</nav>
  <div className="space-tab-body">
  {tab==='mode'&&<><div className="gs-section-title">CHẾ ĐỘ VÀ CẤU HÌNH MẪU</div><div className="gs-grid">
   {field('Chế độ chơi','Endless: sống càng lâu càng tốt · Goal: đạt đủ điểm.',<select value={draft.mode} onChange={e=>patch('mode',e.target.value as SpaceSettings['mode'])}><option value="endless">Endless Survival</option><option value="goal">Score Challenge</option></select>)}
   {draft.mode==='goal'&&slider('goal','Điểm mục tiêu',100,10000,100,'Điểm cần đạt để thắng.',' PTS')}
   {field('Preset độ khó','Thay preset sẽ đặt lại các tùy chỉnh gameplay theo preset được chọn.',<select value={preset} onChange={e=>choosePreset(e.target.value as SpacePreset)}>{['Easy','Normal','Hard','Extreme','Custom'].map(n=><option key={n} value={n}>{n}</option>)}</select>)}
   {slider('lives','Số mạng',1,10,1)}{slider('immunitySeconds','Bất tử sau va chạm',0,3,.1,'Không tính khi đã có khiên.','s')}
   {slider('timeLimit','Giới hạn thời gian',0,600,10,'0 = không giới hạn. Endless sống đủ thời gian là thắng; Goal hết giờ chưa đủ điểm là thua.','s')}
   {toggle('progressive','Tăng độ khó theo thời gian')}
   {draft.progressive&&<>{slider('difficultyEvery','Chu kỳ tăng độ khó',10,120,5,'','s')}{slider('difficultyIncrease','Tăng tốc mỗi chu kỳ',0,30,1,'Có trần 1.6×.','%')}</>}
   </div><div className="gs-section-title">CẤU HÌNH TỰ LƯU</div><div className="space-profile-row"><input aria-label="Tên cấu hình" value={profileName} maxLength={40} onChange={e=>setProfileName(e.target.value)} placeholder="Ví dụ: Thi đấu CLB"/><button className="secondary-btn" onClick={saveProfile}>LƯU PRESET</button></div>{profiles.length>0&&<div className="space-profile-list">{profiles.map(p=><div key={p.name}><strong>{p.name}</strong><button onClick={()=>{setDraft(p.settings);setPreset('Custom');setSaved(false);}}>TẢI</button><button onClick={()=>{try{setProfiles(deleteSpaceProfile(p.name));}catch{}}}>XÓA</button></div>)}</div>}</>}
  {tab==='meteors'&&<><div className="gs-section-title">SINH THIÊN THẠCH</div><div className="gs-grid">
   {slider('meteorSpeed','Tốc độ thiên thạch',.5,3,.1,'Tác động cả 3 hướng bay.','×')}{slider('spawnInterval','Khoảng sinh trung bình',.5,4,.1,'Thời gian trung bình giữa hai đợt sinh.','s')}
   {slider('maxConcurrent','Số thiên thạch đồng thời',1,12,1)}{slider('meteorSize','Kích thước thiên thạch',.5,2,.1,'Bao gồm hitbox.','×')}
   {slider('horizontalWeight','Tỷ trọng bay ngang',0,100,.5,'Hệ thống tự chuẩn hóa tỷ trọng.','%')}{slider('fallingWeight','Tỷ trọng chéo xuống',0,100,.5,'Từ trên phải xuống dưới trái.','%')}
   {slider('risingWeight','Tỷ trọng chéo lên',0,100,.5,'Từ dưới phải lên trên trái.','%')}
   {toggle('heavyMeteors','Thiên thạch lớn','Đường kính lớn hơn và bay chậm hơn.')}{toggle('meteorClusters','Cụm thiên thạch','Sinh thêm một thiên thạch có kiểm tra khoảng cách.')}
   {toggle('splitterMeteors','Thiên thạch phân tách','Tách làm hai mảnh khi còn đủ khoảng cách an toàn.')}{toggle('meteorWaves','Meteor Wave','Một đợt thiên thạch dày hơn mỗi 30 giây.')}
   </div></>}
  {tab==='ship'&&<><div className="gs-section-title">VẬT LÝ PHI THUYỀN</div><div className="gs-grid">
   {slider('shipSpeed','Vận tốc tối đa',.5,2,.1,'','×')}{slider('shipAcceleration','Gia tốc',.5,2,.1,'','×')}
   {slider('shipBrake','Gia tốc hãm',.5,2,.1,'Khả năng dừng trước điểm ngắm.','×')}{slider('shipHitbox','Kích thước va chạm',.7,1.2,.1,'Hitbox không thay đổi kích thước hình ảnh.','×')}{toggle('autoRotate','Xoay phi thuyền theo hướng bay')}
   </div></>}
  {tab==='stars'&&<><div className="gs-section-title">SAO, ĐIỂM VÀ COMBO</div><div className="gs-grid">
   {toggle('starsEnabled','Sinh ngôi sao','Tắt sao sẽ khiến chế độ đạt điểm không thể thắng nếu không bật Near Miss.')}
   {draft.starsEnabled&&<>{slider('starPoints','Điểm mỗi sao',25,500,25,'',' PTS')}{slider('starInterval','Khoảng sinh sao',1,10,.5,'','s')}{slider('starMax','Số sao đồng thời',1,5,1)}{slider('starSpeed','Tốc độ sao',.5,2,.1,'','×')}
   {toggle('starCombo','Combo sao liên tiếp','Mỗi cấp combo thưởng thêm 25 điểm.')}{draft.starCombo&&slider('starComboSeconds','Thời gian duy trì combo',1,10,.5,'','s')}
   {toggle('specialStars','Sao đặc biệt','Sao xanh được 2.5× điểm, hiếm hơn sao thường.')}{toggle('riskStars','Risk Star','Sao đặc biệt có thể xuất hiện gần đường bay thiên thạch.')}</>}
   {toggle('nearMiss','Thưởng né sát thiên thạch','+20 điểm cho mỗi lần né sát hợp lệ.')}{calMessage&&<p className="space-settings-help">{calMessage}</p>}
   </div></>}
  {tab==='skills'&&<><div className="gs-section-title">KỸ NĂNG PHI THUYỀN</div><div className="gs-grid">
   {toggle('shieldEnabled','Shield – Lá chắn','Nhặt biểu tượng khiên để chặn một lần va chạm. Không tích nhiều khiên.')}
   {toggle('dashEnabled','Dash bằng ngón trỏ + ngón giữa','Giữ ngón trỏ đang chỉ, duỗi thêm ngón giữa khoảng 120 ms để Dash; điểm ngắm vẫn lấy từ ngón trỏ. Bàn phím: Shift.')}
   {draft.dashEnabled&&<>{slider('dashBoost','Hệ số tốc độ Dash',1.5,4,.1,'Dash kéo dài 0.22 giây.','×')}{slider('dashCooldown','Hồi chiêu Dash',1,10,.5,'Cần thả pose rồi giơ lại để kích hoạt.','s')}</>}
   </div><p className="space-settings-help">Dash: giữ hướng khi kích hoạt, không tự đổi hướng giữa Dash. Bất tử trong phần lớn thời gian lao nhanh; không lạm dụng để xuyên tường hoặc bay khỏi vùng game.</p></>}
  {tab==='ai'&&<><div className="gs-section-title">NHẬN DIỆN VÀ HIỆU CHUẨN</div><div className="gs-grid">{slider('aimSensitivity','Độ nhạy điểm ngắm',.5,2,.1,'Không thay đổi tốc độ nhận diện camera.','×')}</div>
   <div className="space-calibration"><strong>Hiệu chuẩn 2 điểm (webcam 2D)</strong><p>Trỏ đầu ngón vào góc trên-trái của vùng game và nhấn ghi điểm 1. Sau đó trỏ góc dưới-phải và nhấn ghi điểm 2. Hai điểm phải có đủ khoảng cách.</p>
   <div className="space-profile-row"><button className="secondary-btn" type="button" onClick={capture}>{calFirst?'GHI ĐIỂM 2':'GHI ĐIỂM 1'}</button><button className="ghost-btn" type="button" onClick={()=>{onCalibration(null);setCalFirst(null);setCalMessage('Đã xóa hiệu chuẩn.');}}>XÓA HIỆU CHUẨN</button></div>
   <small>{calMessage|| (calibration?'Đang dùng hiệu chuẩn đã lưu.':'Chưa hiệu chuẩn. Dùng phép chiếu mặc định.')}</small></div>
   <p className="space-settings-help">Camera đơn chỉ ước lượng điểm đích theo ảnh 2D, không đo tia ngắm 3D tuyệt đối. Hiệu chuẩn không cần tải lại MediaPipe.</p></>}
  {tab==='effects'&&<><div className="gs-section-title">HIỆU ỨNG VÀ PHẢN HỒI</div><div className="gs-grid">
   <label className="gs-field gs-switch-field"><span><b>Bật âm thanh</b><small>Dùng chung Sword Fruit.</small></span><input type="checkbox" checked={sound} onChange={e=>{setSound(e.target.checked);setSaved(false);}}/></label>{slider('soundVolume','Âm lượng Space Dodge',0,100,5,'Chỉ áp dụng lúc chơi Space Dodge.','%')}
   {toggle('warning','Cảnh báo thiên thạch','Hiển thị dải cảnh báo vùng sinh bên phải.')}{toggle('screenShake','Rung màn hình khi va chạm')}{toggle('engineTrail','Vệt động cơ phi thuyền')}{toggle('meteorTrail','Vệt sáng thiên thạch')}{toggle('reducedMotion','Giảm chuyển động','Ẩn vệt sáng và giảm hiệu ứng rung mạnh.')}
   </div></>}
  </div>
  <div className="gs-footer"><button className="secondary-btn" onClick={reset}>↺ KHÔI PHỤC MẶC ĐỊNH</button><div className="gs-footer-right">{saved&&<span className="gs-saved">✓ Đã lưu</span>}<button className="ghost-btn" onClick={onClose}>ĐÓNG</button><button className="primary-btn" onClick={()=>commit(draft)}>LƯU CÀI ĐẶT</button></div></div>
 </section></div>;
}
