import {useEffect,useState} from 'react';
import {SPACE_DEFAULTS,normalizeSpaceSettings,type SpaceSettings} from '../game/spaceRules.ts';
type Props={initial:SpaceSettings;activeRound:boolean;soundEnabled:boolean;onSave:(next:SpaceSettings,sound:boolean)=>void;onClose:()=>void};
export function SpaceSettingsScreen({initial,activeRound,soundEnabled,onSave,onClose}:Props){
 const [draft,setDraft]=useState<SpaceSettings>(()=>({...initial}));const [sound,setSound]=useState(soundEnabled);const [saved,setSaved]=useState(false);
 const patch=<K extends keyof SpaceSettings>(k:K,v:SpaceSettings[K])=>{setDraft(s=>normalizeSpaceSettings({...s,[k]:v}));setSaved(false);};
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();onClose();}};window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);},[onClose]);
 const commit=(next:SpaceSettings)=>{const safe=normalizeSpaceSettings(next);onSave(safe,sound);setDraft(safe);setSaved(true);};
 return <div className="game-settings-overlay" role="dialog" aria-modal="true" aria-labelledby="space-settings-title"><section className="game-settings-page">
  <div className="gs-header"><div><span className="eyebrow">SPACE DODGE · V2.0</span><h2 id="space-settings-title">Cài đặt phi thuyền</h2><p>Áp dụng từ lượt chơi tiếp theo. Chế độ và cấu hình có bảng xếp hạng riêng.</p></div><button className="gs-close" onClick={onClose} aria-label="Đóng cài đặt">✕</button></div>
  {activeRound&&<div className="gs-notice">Ván hiện tại đã tạm dừng; các thay đổi độ khó chỉ áp dụng lượt mới.</div>}
  <div className="gs-section-title">🚀 &nbsp; CHẾ ĐỘ VÀ ĐỘ KHÓ</div><div className="gs-grid">
   <label className="gs-field"><span><b>Chế độ chơi</b><small>Endless: hết mạng mới thua · Goal: chạm mốc điểm để thắng.</small></span><select value={draft.mode} onChange={e=>patch('mode',e.target.value as SpaceSettings['mode'])}><option value="endless">Endless Survival</option><option value="goal">Score Challenge</option></select></label>
   {draft.mode==='goal'&&<label className="gs-field"><span><b>Điểm mục tiêu</b><small>Mỗi sao +100 điểm.</small></span><select value={draft.goal} onChange={e=>patch('goal',Number(e.target.value))}>{[500,1000,1500,2000,2500,3000].map(n=><option key={n} value={n}>{n.toLocaleString('vi-VN')} điểm</option>)}</select></label>}
   <label className="gs-field"><span><b>Số mạng</b><small>Va chạm thiên thạch trừ một mạng.</small></span><div className="gs-range"><input type="range" min={1} max={5} step={1} value={draft.lives} onChange={e=>patch('lives',Number(e.target.value))}/><output>{draft.lives}</output></div></label>
   <label className="gs-field"><span><b>Tốc độ thiên thạch</b></span><div className="gs-range"><input type="range" min={.5} max={2} step={.1} value={draft.meteorSpeed} onChange={e=>patch('meteorSpeed',Number(e.target.value))}/><output>{draft.meteorSpeed.toFixed(1)}×</output></div></label>
   <label className="gs-field"><span><b>Tốc độ phi thuyền</b></span><div className="gs-range"><input type="range" min={.5} max={2} step={.1} value={draft.shipSpeed} onChange={e=>patch('shipSpeed',Number(e.target.value))}/><output>{draft.shipSpeed.toFixed(1)}×</output></div></label>
   <label className="gs-field gs-switch-field"><span><b>Độ khó tăng theo thời gian</b><small>Tăng mỗi 30 giây và có giới hạn tối đa.</small></span><input type="checkbox" checked={draft.progressive} onChange={e=>patch('progressive',e.target.checked)}/></label>
  </div><div className="gs-section-title">♫ &nbsp; ÂM THANH</div><div className="gs-grid"><label className="gs-field gs-switch-field"><span><b>Bật hiệu ứng âm thanh</b><small>Dùng chung tùy chọn âm thanh với Sword Fruit.</small></span><input type="checkbox" checked={sound} onChange={e=>{setSound(e.target.checked);setSaved(false);}}/></label></div>
  <div className="gs-footer"><button className="secondary-btn" onClick={()=>{setSound(true);const d={...SPACE_DEFAULTS};onSave(d,true);setDraft(d);setSaved(true);}}>↺ KHÔI PHỤC MẶC ĐỊNH</button><div className="gs-footer-right">{saved&&<span className="gs-saved">✓ Đã lưu</span>}<button className="ghost-btn" onClick={onClose}>ĐÓNG</button><button className="primary-btn" onClick={()=>commit(draft)}>LƯU CÀI ĐẶT</button></div></div>
 </section></div>;
}
