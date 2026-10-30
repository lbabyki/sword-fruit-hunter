# Sword Fruit – Word Hunter V2.2 (Space Dodge Advanced Gameplay)

## Đã triển khai
- `pinky` gesture (ngón út duỗi riêng) và `PinkyDashTrigger` giữ 120ms, thả tay để kích hoạt lại.
- Dash 0,22 giây theo điểm ngắm hoặc hướng di chuyển gần nhất, 1,5–4×, cooldown 1–10 giây. Shift dùng khi thử bàn phím. HUD hiển thị Dash ready/active/cooldown.
- Shield collectible, bảo vệ một lần va chạm; không cộng dồn.
- Heavy meteor, Cluster có kiểm tra khoảng cách, Splitter phân tách khi ở xa phi thuyền, Meteor Wave.
- Combo sao, sao đặc biệt/Risk Star, +20 Near Miss.
- Điều khiển theo tốc độ, gia tốc, phanh, aim sensitivity; trần số thiên thạch và đường bay phải qua safe-spawn.
- Settings nhiều tab, preset đặt tên lưu localStorage, hiệu chuẩn 2 điểm camera 2D.
- Hiệu ứng mới cho Dash/Shield, âm lượng riêng Space Dodge, giảm chuyển động và cảnh báo vị trí thiên thạch.

## Giới hạn chưa xác minh
- Chưa chạy được npm install/npm run build trong môi trường bàn giao vì registry.npmjs.org không truy cập được.
- Chưa đo hiệu năng hay tỷ lệ phát hiện ngón út trên webcam thực tế; test cử chỉ sử dụng landmark mô phỏng.
- Hiệu chuẩn dùng phép ánh xạ 2D, không phải ray-casting 3D.
- Các mức độ khó tùy chỉnh cực cao cần playtest để kiểm tra công bằng, nhất là Cluster/Splitter.

## Giữ nguyên
Chế độ Sword Fruit, combo, chữ cái, settings hiện có, âm thanh chém quả/bom, top 5 và hệ thống xử lý webcam/Web Worker.
