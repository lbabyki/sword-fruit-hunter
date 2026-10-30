# QA Checklist – Space Dodge V2.2

## Trước khi kiểm thử
`npm install && npm test && npm run build && npm run dev` trên Node.js >=22. Cho phép Chrome/Edge truy cập webcam trên localhost hoặc HTTPS.

## Smoke tests
- [ ] Sword Fruit có thể bắt đầu, chém quả, điểm/combo/bom không đổi.
- [ ] Chuyển qua Space Dodge, mở Settings, chuyển tab, áp dụng preset và lưu/tải preset tùy chỉnh.
- [ ] Cài đặt thay đổi chỉ có hiệu lực ở ván mới; đang chơi mở Settings sẽ tạm dừng.
- [ ] Phát hiện chỉ ngón út và không nhầm khi xòe năm ngón, chỉ ngón trỏ/giữa hoặc nắm tay.
- [ ] Giữ ngón út 120ms kích hoạt Dash; giữ lâu không Dash lặp; thả và giơ lại sau hồi chiêu mới kích hoạt.
- [ ] Dash bám hướng cũ, không chuyển tới điểm bất ngờ; không vượt mép màn hình.
- [ ] Bật Shield, nhặt khiên; một lần va chạm tiêu thụ khiên nhưng không mất máu.
- [ ] Chạy Heavy, Cluster, Splitter, Meteor Wave; thiên thạch không xuất hiện ở vị trí bất khả thi.
- [ ] Combo sao và sao đặc biệt cộng đúng; Near Miss không cộng nhiều lần trên cùng thiên thạch.
- [ ] Thử Score Challenge với mốc điểm, hết giờ, hết mạng; Endless có/không có giới hạn thời gian.
- [ ] Đặt số thiên thạch đồng thời 1 rồi 12, quan sát không vượt trần.
- [ ] Hiệu chuẩn camera góc trên-trái và dưới-phải, kiểm tra dấu ngắm và reset.
- [ ] Tắt âm/điều chỉnh âm lượng; Dash/Shield có tiếng riêng, không ngắt nhạc/vòng lặp AI.
- [ ] Reduced Motion tắt rung/vệt; cảnh báo phía phải vẫn hiển thị.
- [ ] Top 5 phân theo cấu hình gameplay; thay đổi đồ họa/âm lượng không làm đổi bảng.
- [ ] Thử webcam mất tracking rồi phục hồi; không cộng thêm thời gian trong lúc pause.
- [ ] Đo FPS và độ trễ tại mức khó Easy/Extreme bằng webcam máy thật.

## Hạn chế
Không xác nhận hệ thống đủ điều kiện thi đấu cho tới khi hoàn tất QA trực tiếp trên máy và cân chỉnh AI.
