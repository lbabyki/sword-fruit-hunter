# RELEASE NOTES — Sword Fruit V1.2 (Fingertip Tracking / Low Latency)

## User-visible changes

- Điểm ngắm đi theo **tọa độ đầu ngón trỏ/giữa** và được dẫn thêm theo hướng chỉ; không buộc phải thấy cả hai ngón cùng lúc.
- Khi một ngón bị chồng/khuất, bộ phân loại vẫn chấp nhận ngón còn có landmark đủ tốt.
- Hai đầu ngón đều đủ tin cậy thì hợp nhất có trọng số; cử chỉ xòe năm ngón/nắm tay vẫn giữ nguyên.
- Kiếm tự di chuyển tới vị trí ngắm với vật lý V1.1; không tăng độ trễ bằng dwell 140ms.
- Camera preview giữ đủ khung hình, không crop mép; hiển thị ngón đang được dùng và độ trễ xử lý gần đúng.

## Engineering changes

- `src/tracking/gestures.ts`: geometry + adaptive smoothing/limited extrapolation.
- `src/tracking/handWorker.ts`: MediaPipe trong Web Worker với `ImageBitmap`.
- `src/tracking/useHandTracking.ts`: gửi frame mới nhất, chỉ 1 lần infer outstanding, fallback main thread, tránh rerender React mỗi frame.
- `src/App.tsx`, `src/styles.css`: UX & overlay.
- `tests/gestures.test.mjs`: synthetic tests cho one-finger, dual-finger, mirror, open, aiming, smoothing.

## Test results & known limits

- 40/40 automated tests PASS, core tsc PASS, TS syntax PASS.
- npm install/build không chạy được trong môi trường bàn giao (`registry.npmjs.org` DNS EAI_AGAIN); browser webcam và worker phải được xác nhận trên máy người dùng.
- Dataset ảnh 252 tấm chỉ dùng để quan sát pose; chưa chạy MediaPipe để kiểm thử đủ 252 tấm; chưa train model mới.
- Camera 2D không thể xác định chính xác tia ngón tay đâm vào mặt phẳng 3D. V1.2 điều khiển nhờ phép chiếu lên ảnh với gain cố định.

## Instructions

1. Giải nén ZIP đầy đủ hoặc patch vào project V1.1, giữ nguyên cấu trúc đường dẫn.
2. `npm install`
3. `npm run dev` và truy cập `http://localhost:5173`.
4. Bật camera, chỉ 1 ngón/2 ngón, quan sát dấu ngắm. Xòe năm ngón để bắt đầu/tiếp tục/chơi lại.
5. Xem nhãn “AI sẵn sàng · xử lý ở worker”; nếu “fallback”, báo thông tin trình duyệt, loại camera và độ trễ UI để xử lý sâu hơn.
6. Kiểm tra `npm test` và `npm run build`.
