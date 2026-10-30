import {useEffect,useState} from 'react';
import {
  DEFAULT_SETTINGS,EXTRA_LETTERS,normalizeSettings,extraWordLengths,type ExtraLetters,type GameSettings
} from '../game/settings.ts';

type Props={initial:GameSettings;activeRound:boolean;onSave:(value:GameSettings)=>void;onClose:()=>void};
const extraText=(extra:ExtraLetters)=>extra===0?'Không thêm từ':`+${extra} chữ · ${extraWordLengths(extra).map(n=>`${n} chữ`).join(' + ')}`;
export function GameSettingsScreen({initial,activeRound,onSave,onClose}:Props){
  const [draft,setDraft]=useState<GameSettings>(()=>({...initial}));
  const [saved,setSaved]=useState(false);
  const patch=<K extends keyof GameSettings>(key:K,value:GameSettings[K])=>{
    setSaved(false);setDraft(s=>normalizeSettings({...s,[key]:value}));
  };
  useEffect(()=>{
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape') {e.stopPropagation();onClose();}};
    window.addEventListener('keydown',escape);
    return ()=>window.removeEventListener('keydown',escape);
  },[onClose]);
  const save=(next:GameSettings)=>{const clean=normalizeSettings(next);onSave(clean);setDraft(clean);setSaved(true);};
  return <div className="game-settings-overlay" role="dialog" aria-modal="true" aria-labelledby="game-settings-title">
    <section className="game-settings-page">
      <div className="gs-header"><div><span className="eyebrow">GAME CONFIGURATION · V1.6</span><h2 id="game-settings-title">Cài đặt màn chơi</h2><p>Điều chỉnh độ khó và cách tính điểm. Cấu hình sẽ áp dụng từ <strong>lượt chơi mới</strong>.</p></div><button type="button" className="gs-close" aria-label="Đóng cài đặt" onClick={onClose}>✕</button></div>
      {activeRound&&<div className="gs-notice" role="status">Ván đang chơi đã được tạm dừng. Mọi thay đổi chỉ áp dụng khi bắt đầu lượt mới; ván hiện tại vẫn sử dụng cấu hình cũ.</div>}
      <div className="gs-section-title">☄ &nbsp; VẬT THỂ VÀ ĐỘ KHÓ</div>
      <div className="gs-grid">
        <label className="gs-field gs-switch-field"><span><b>Bật bom</b><small>Tắt để chơi hoàn toàn không có bom.</small></span><input aria-label="Bật bom" type="checkbox" checked={draft.bombsEnabled} onChange={e=>patch('bombsEnabled',e.target.checked)}/></label>
        <label className="gs-field"><span><b>Bom thả cùng mỗi đợt hoa quả</b><small>0 = cơ chế bom gốc theo chặng · 1–2 = bom bổ sung mỗi đợt có quả mới.</small></span><select value={draft.bombsPerWave} disabled={!draft.bombsEnabled} onChange={e=>patch('bombsPerWave',Number(e.target.value))}><option value={0}>0 · Theo cơ chế gốc</option><option value={1}>1 bom mỗi đợt</option><option value={2}>2 bom mỗi đợt</option></select></label>
        <label className="gs-field gs-switch-field"><span><b>Bom nổ có thể kết thúc game</b><small>Khi bật, vượt quá số bom được phép chịu sẽ kết thúc lượt và không ghi Top 5.</small></span><input aria-label="Bom nổ kết thúc game" type="checkbox" checked={draft.bombGameOver} disabled={!draft.bombsEnabled} onChange={e=>patch('bombGameOver',e.target.checked)}/></label>
        <label className="gs-field"><span><b>Số lần bom được phép chịu</b><small>0 = trúng lần đầu sẽ thua · 3 = quả bom thứ tư sẽ thua.</small></span><div className="gs-range"><input type="range" min="0" max="20" step="1" value={draft.bombLimit} disabled={!draft.bombsEnabled||!draft.bombGameOver} onChange={e=>patch('bombLimit',Number(e.target.value))}/><output>{draft.bombLimit}</output></div></label>
        <label className="gs-field"><span><b>Tốc độ hoa quả</b><small>Điều chỉnh vận tốc quỹ đạo, không làm thay đổi hướng xuất hiện.</small></span><div className="gs-range"><input type="range" min="0.5" max="2" step="0.1" value={draft.fruitSpeed} onChange={e=>patch('fruitSpeed',Number(e.target.value))}/><output>{draft.fruitSpeed.toFixed(1)}×</output></div></label>
        <label className="gs-field"><span><b>Tốc độ kiếm</b><small>Hệ số vận tốc, gia tốc và hãm của thanh kiếm.</small></span><div className="gs-range"><input type="range" min="0.5" max="2" step="0.1" value={draft.swordSpeed} onChange={e=>patch('swordSpeed',Number(e.target.value))}/><output>{draft.swordSpeed.toFixed(1)}×</output></div></label>
        <label className="gs-field"><span><b>Kéo dài màn chơi</b><small>Thêm các từ hoàn chỉnh sau 3 từ gốc (15 chữ).</small></span><select value={draft.extraLetters} onChange={e=>patch('extraLetters',Number(e.target.value) as ExtraLetters)}>{EXTRA_LETTERS.map(n=><option value={n} key={n}>{extraText(n)}</option>)}</select></label>
        <label className="gs-field gs-switch-field"><span><b>Cho phép chém chữ bất kỳ</b><small>Chém các chữ còn thiếu theo thứ tự tùy ý; chữ lặp vẫn phải lấy đủ số lần.</small></span><input type="checkbox" checked={draft.unorderedLetters} onChange={e=>patch('unorderedLetters',e.target.checked)}/></label>
      </div>
      <div className="gs-section-title">♫ &nbsp; ÂM THANH</div>
      <div className="gs-grid">
        <label className="gs-field gs-switch-field"><span><b>Bật âm thanh hiệu ứng</b><small>Âm thanh chém hoa quả, bom và nhấn nút. Không cần tải âm thanh từ mạng. Bật/tắt sau khi lưu cài đặt và có tác dụng ngay, kể cả giữa lượt chơi.</small></span><input aria-label="Bật âm thanh hiệu ứng" type="checkbox" checked={draft.soundEnabled} onChange={e=>patch('soundEnabled',e.target.checked)}/></label>
      </div>
      <div className="gs-section-title">◷ &nbsp; ĐIỂM KẾT THÚC</div>
      <div className="gs-grid">
        <label className="gs-field"><span><b>Mốc thời gian tính điểm</b><small>Mặc định 50 giây. Đây là mốc thưởng điểm, <strong>không phải giới hạn kết thúc ván</strong>.</small></span><div className="gs-range"><input type="range" min="30" max="300" step="5" value={draft.scoreTimeSeconds} onChange={e=>patch('scoreTimeSeconds',Number(e.target.value))}/><output>{draft.scoreTimeSeconds}s</output></div></label>
        <label className="gs-field"><span><b>Điểm mỗi giây tiết kiệm</b><small>Mặc định 25 điểm/giây; thời gian vượt mốc sẽ trừ điểm theo cùng hệ số.</small></span><div className="gs-range"><input type="range" min="0" max="100" step="5" value={draft.pointsPerSecond} onChange={e=>patch('pointsPerSecond',Number(e.target.value))}/><output>{draft.pointsPerSecond}</output></div></label>
      </div>
      <div className="gs-formula"><span>CÔNG THỨC ĐIỂM KẾT</span><strong>Điểm gốc + ({draft.scoreTimeSeconds} − thời gian xếp hạng) × {draft.pointsPerSecond}</strong><small>Thời gian xếp hạng đã bao gồm +5 giây cho mỗi bom.</small></div>
      <div className="gs-footer"><button type="button" className="secondary-btn" onClick={()=>save({...DEFAULT_SETTINGS})}>↺ &nbsp; KHÔI PHỤC MẶC ĐỊNH</button><div className="gs-footer-right">{saved&&<span className="gs-saved" role="status">✓ Đã lưu cài đặt</span>}<button type="button" className="ghost-btn" onClick={onClose}>ĐÓNG</button><button type="button" className="primary-btn" onClick={()=>save(draft)}>LƯU CÀI ĐẶT</button></div></div>
    </section>
  </div>;
}
