## V1.5 Sound Effects (2026-10-17)

- Web Audio synthesized effects: fruit, bomb, UI button.
- One-click AudioContext unlock and shared master volume; no network assets.
- `soundEnabled` saved locally; applied upon Save, including during paused rounds.
- Sound setting intentionally omitted from ranking signature (`settingsKey`).
- Browser / webcam / real speaker testing still required.

# V1.4 — CHECKPOINT

**Checkpoint:** `SF-V1.4-ROUND_SETTINGS_PLAYER_NAME_SOURCE_READY_QA_PENDING`

- Hoàn thành source code màn setting game và player-name center bar, gồm fullscreen, quản lý localStorage.
- Bổ sung tùy chỉnh số bom/đợt (và bật/tắt), tốc độ hoa quả, tốc độ kiếm, tăng độ dài game bằng từ hoàn chỉnh, chế độ thu thập bất kỳ, mốc thời gian tính điểm, hệ số điểm/giây, khôi phục mặc định.
- Đã bỏ ngừng ván tự động ở mốc tính điểm (50s chỉ là reference). Khi vượt 50 giây, time bonus âm nhưng game vẫn chơi được.
- Bảng top 5 giới hạn theo cấu hình + chế độ để so sánh hợp lý, bảo lưu dữ liệu cũ cho cấu hình mặc định.
- **63/63 bài test Node PASS; core strict typecheck PASS; TS/TSX syntax PASS.**
- **Chưa xác nhận Vite bundle/browser/webcam thực tế** vì không cài được dependency từ npm registry trong môi trường này.

Xem `RELEASE_NOTES_V1.4.md` và `README.md` để chạy và nghiệm thu.

---

# Sword Fruit V1.3 – Implementation Status

Checkpoint: `SF-V1.3-FULLSCREEN_TOP5_FINALSCORE_GESTURE_TOLERANCE_READY_FOR_QA`

- Fullscreen workspace (arena + sidebar only): coded; browser QA pending.
- Top 5 (score/time): coded; backward compatible with previous localStorage records.
- Final score `(50 - rankSeconds) * 25` bonus/penalty: coded and tested.
- 38-image reference dataset reviewed visually; tolerant one/two finger landmark logic implemented. No model retraining; not yet tested 38 images through MediaPipe.
- `npm test`: 50 PASS / 0 FAIL.
- Core rules/storage/gesture typecheck PASS; TypeScript source parse PASS.
- Vite browser build: pending (no npm dependencies in container). Live webcam QA: pending.

# Sword Fruit – Implementation Handoff

**Checkpoint:** `SF-V1-PROTOTYPE-SOURCE_READY_QA_PENDING`
**Ngày:** 2026-10-17

## Tình trạng chức năng

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| React/TypeScript UI | Implemented; chưa build với npm | HUD 70/30, responsive |
| Game loop Phaser | Implemented; tested headless mock | update, frame, game phases |
| Bản đồ 4 hướng & quỹ đạo cong | Implemented; tests pass | random có ràng buộc |
| Kiểm tra đường bay tiếp cận được | Implemented; tests pass | dựa trên travel time kiếm |
| Va chạm kiếm chuyển động | Implemented; tests pass | swept sampled blade |
| Hand Landmarker | Implemented; webcam QA pending | model tải từ web lúc chạy |
| Hai ngón chỉ hướng / nắm tay | Implemented; synthetic tests pass | cần tuning trên webcam thật |
| Mất tracking 0,5s | Implemented; scene test pass | auto-pause và invalidates competitive run |
| Chữ 3/5/7, thứ tự | Implemented; tests pass | 15 ký tự tổng |
| Combo additive | Implemented; tests pass | 3,5s, +25 mỗi cấp |
| Bom +5s, mất combo | Implemented; tests pass | max 0/1/2 spawn mỗi stage |
| Chém tách đôi & particle | Implemented; graphics QA pending | không dùng asset ngoài |
| Top 3 điểm / thời gian | Implemented; tests rank pass | localStorage per browser |
| Chế độ bàn phím thử nghiệm | Implemented; browser QA pending | WASD/arrows + Space |
| Chế độ seed thi đấu | Implemented; preliminary | action-dependent spawn vẫn ảnh hưởng fairness |
| Node tests | **22/22 PASS** | core, gesture, mocked scene |
| Core typecheck | **PASS** | luật và gesture |
| Vite full build | **NOT RUN** | không truy cập được npm registry trong môi trường tạo mã |
| Browser webcam QA | **NOT RUN** | cần kiểm tra trên Chrome/Edge thật |

## QA Checklist – thực hiện trên máy Windows có mạng

1. Chạy `start-windows.bat` hoặc `npm install && npm run dev`.
2. Chạy `npm run build` và báo lại lỗi nếu có.
3. Bật chế độ bàn phím, test WASD/Arrow/Space và va chạm hoa quả, hoàn thành 3 từ.
4. Bật camera AI, xác nhận skeleton 21 landmarks, hai ngón khép và nắm tay. Kiểm tra độ trễ / rung ở 8 hướng và góc nghiêng khác nhau.
5. Kiểm tra camera hướng mirrored: chỉ tay sang phải phải làm kiếm bay sang phải.
6. Kiểm tra hoa quả di chuyển từ 4 cạnh, không đi ở góc, không có mục tiêu thiếu quá lâu.
7. Kiểm tra chém sai đặt combo về 0, chữ không mất tiến độ; bom +5s, combo=0.
8. Kiểm tra màn chuyển stage không trừ thời gian chơi và giữ combo.
9. Kiểm tra kết quả đủ 3 từ, điểm và top 3 không trộn lẫn chế độ keyboard / webcam.
10. Rút webcam / che tay trong khi đang chơi: game phải pause sau ~0,5s.
11. Kiểm tra trên 1366×768 và 1920×1080; FPS 60 mục tiêu.

## Các điểm cần chốt sau QA

- Chọn ngưỡng hai ngón khép theo tỉ lệ bàn tay và góc camera thực tế; hiện là giá trị baseline.
- Tuning tốc độ kiếm 520px/s, gia tốc 2600px/s², combo 3,5s.
- Nếu dùng thi đấu giữa nhiều máy: tách gameplay authoritative / ghi seed/quỹ đạo/timestamp để xác minh; localStorage hiện chỉ là demo.
- Nếu webcam recognition tải CPU gây drop frame, cân nhắc `Web Worker` + timestamp.
- Có thể thêm asset nhân vật/hoa quả và âm thanh sau khi gesture ổn định.

## Files then next action

- Read `README.md` để chạy.
- `src/game/rules.ts` là nguồn sự thật cho điểm, vật lý và quỹ đạo.
- `src/tracking/gestures.ts` là điểm điều chỉnh hand gesture.
- `src/game/SwordFruitScene.ts` xử lý gameplay.
- `src/App.tsx` xử lý giao diện.

**Chú ý:** Đây là mã nguồn prototype có unit/integration logic tests, **không được mô tả là bản đã QA camera hoặc đã được build thành công**.


## V1.0.1 — MediaPipe WASM 404 remediation (2026-10-17)

- **Root cause:** đường dẫn CDN hardcode `@mediapipe/tasks-vision@0.10.22` không có bản release ổn định, gây 404 cho `vision_wasm_internal.js`; lỗi MIME `text/plain` là hệ quả.
- **Fix:** npm pin `@mediapipe/tasks-vision@0.10.32` (có đủ 4 file WASM); `scripts/sync-mediapipe-assets.mjs` copy chính file từ package đã cài sang `public/mediapipe/wasm`; hook chỉ dùng local URL dựa trên `import.meta.env.BASE_URL`.
- **Automation:** npm `postinstall`, `predev`, `prebuild` chạy đồng bộ WASM; dùng cả SIMD và non-SIMD.
- **Regression:** thêm `tests/mediapipe-assets.test.mjs` để xác minh copy và lỗi đầu vào.
- **Remaining QA:** không thể tải npm registry trong môi trường tạo mã nên chưa chạy được bundling end-to-end hoặc xác thực webcam. Yêu cầu `npm install`, `npm run build` và QA camera trên Windows. Model `.task` vẫn phụ thuộc Google Storage.


## V1.1 — Finger-target navigation + open palm action

- Camera two-finger signal carries a `target` mapped from projected midpoint of two fingertips and their pointing ray (mirror and crop calibrated to arena). Sword seeks target with controlled acceleration and braking. Existing keyboard controls unchanged.
- Visual reticle marks target, including on idle/paused screens for calibration.
- Open all five fingers for start / resume / replay, hold/edge gated; no restart while actively playing; fist still brakes.
- Unit + headless scene tests added. Requires real webcam QA and full npm build on machine with dependencies.


## V1.2 — Fingertip aim + low-latency (2026-10-17)

**Checkpoint:** `SF-V1.2-FINGERTIP_SINGLE_FALLBACK_WORKER_READY_QA_PENDING`

- Định vị mục tiêu theo TIP index/middle, tùy chất lượng landmark; áp dụng fallback một ngón, 2 ngón có thể dùng trung bình có trọng số.
- Điểm ngắm = tọa độ đầu ngón cộng 27% vector MCP→TIP, mirror một lần, crop camera 10% theo X và 9% theo Y.
- Gỡ chờ 140ms ở đường nhận diện `point`; dùng adaptive smoothing alpha 0.57–0.93, extrapolation ≤28px, chỉ giữ debounce cho open palm.
- MediaPipe inference ưu tiên worker `src/tracking/handWorker.ts`, không chồng frame; fallback main thread khi worker lỗi/không hỗ trợ; React HUD throttle 110ms, gameplay không throttle.
- Canvas camera dùng videoWidth/videoHeight thật và preview `object-fit: contain` để tránh tọa độ landmark lệch ảnh do crop.
- Nhãn UI chỉ rõ dùng `TRỎ`, `GIỮA`, hay `HAI NGÓN`, hiển thị thời gian xử lý lấy frame → trả landmark (không phải glass-to-glass).
- **40/40 unit+headless mock tests PASS**; core typecheck PASS; 4 file mới/sửa qua TS transpile syntax check.
- **Chưa làm được:** `npm run build`/QA camera thực tế do npm registry bị DNS EAI_AGAIN; không thể tuyên bố tính năng worker hay độ trễ đã đạt SLA. Phải kiểm thử toàn bộ 252 ảnh/ví dụ tư thế bằng MediaPipe và thử cử động tay trên camera thật.
