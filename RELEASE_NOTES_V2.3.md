# Sword Fruit / Space Dodge V2.3 – Gesture Simplification

## Yêu cầu mới
1. Chỉ ngón trỏ điều khiển vị trí kiếm/phi thuyền.
2. Giơ thêm ngón giữa cùng ngón trỏ để Dash (Space Dodge). Không dùng ngón út nữa.
3. Kiểm tra nguyên nhân độ chính xác nhận diện giảm sau khi mở rộng cử chỉ và có bảng trạng thái.

## Chẩn đoán
- V2.2 có nhiều nhánh lọc cử chỉ cạnh tranh: point sử dụng ngón trỏ/ngón giữa/ghép, pinky dành cho Dash, cùng open palm và fist.
- Khi các ngón chồng lên nhau, bộ chọn nguồn và bộ lọc mục tiêu có thể thay đổi, gây nhảy điểm ngắm hoặc mất signal.
- Không có bằng chứng rằng model MediaPipe đã được fine-tune/train thêm. Đây là thay đổi về bộ phân loại **sau model**.

## Thay đổi mã
- `src/tracking/gestures.ts`: point lấy duy nhất đầu ngón trỏ; nhận index + middle là `dash` nhưng vẫn mang cùng target từ ngón trỏ; bỏ PinkyDashTrigger.
- `src/tracking/handWorker.ts`, `src/tracking/useHandTracking.ts`: truyền `worldLandmarks` khi MediaPipe trả về để phân tích ngón theo 3D; thêm timestamp của khung được nhận diện.
- `src/game/SpaceDodgeScene.ts`: Dash chỉ nhận hai ngón, giữ khoảng 120 ms qua các inference frames thực, chặn lặp cho tới khi thả và hồi chiêu; tiếp tục dùng target khi đang có pose Dash.
- `src/game/SwordFruitScene.ts`: khi trỏ + giữa, kiếm vẫn dùng target index.
- `src/components/SpaceSettingsScreen.tsx`, `src/App.tsx`: cập nhật labels & hướng dẫn trong UI.
- Tests: cập nhật các test cũ sai với yêu cầu mới, thêm hồi quy chuyển pose, index-only 8 hướng, 3D edge-on, guard tránh Dash do stale frame.

## Đã kiểm thử và giới hạn
- Toàn bộ bài kiểm thử unit/scene ở chế độ headless đạt (không thay thế QA webcam).
- Kiểm tra TypeScript của phần lõi và kiểm tra cú pháp TS/TSX.
- Chưa đo tỷ lệ nhận diện từ webcam thật hoặc chạy build Vite trong môi trường này do chưa cài được dependency npm.
