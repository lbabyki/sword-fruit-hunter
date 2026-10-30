# QA Checklist V2.3 – Index Aim & Two-Finger Dash

## Luật cử chỉ
- [ ] Ngón trỏ đơn: kiếm/phi thuyền theo dấu ngắm; kiểm tra tám hướng, góc nghiêng, mặt bên và hướng gần camera.
- [ ] Ngón giữa đơn: không tạo lệnh di chuyển.
- [ ] Ngón út đơn: không kích hoạt Dash.
- [ ] Ngón trỏ + ngón giữa: dấu ngắm vẫn theo đầu ngón trỏ, không nhảy sang trung điểm hai ngón.
- [ ] Giữ trỏ + giữa đủ 120 ms với kết quả webcam mới: kích hoạt Dash một lần ở Space Dodge (nếu bật).
- [ ] Thả ngón giữa rồi giơ lại sau hồi chiêu mới Dash lần nữa.
- [ ] Chỉ lướt ngón giữa rất nhanh: không kích hoạt Dash.
- [ ] Sword Fruit: trỏ + giữa vẫn điều khiển kiếm bình thường, không có Dash.
- [ ] Nắm tay: hãm; mở đủ năm ngón: start/resume/restart; không nhầm sang Dash.

## Độ trễ và độ ổn định
- [ ] Test webcam thật với ánh sáng yếu, nền phức tạp, xoay cổ tay và chỉ gần thẳng vào camera.
- [ ] Ghi tỷ lệ detection (true positive / false negative), false Dash/phút, latency camera→game trung vị và P95.
- [ ] Không biến một inference result kéo dài trong vòng render thành 120 ms giữ Dash.
- [ ] Kiểm tra worker và fallback main thread, cả hai đều có worldLandmarks.
- [ ] Test webcam 30 FPS và thiết bị yếu, bảo đảm không chất hàng frame inference.

## Hồi quy
- [ ] Kiểm tra Sword Fruit: từ ngữ, combo, bom, cài đặt, top 5, âm thanh.
- [ ] Kiểm tra Space Dodge: shield, sao, thiên thạch, goal/endless, Dash, top 5, fullscreen.
- [ ] `npm test` và `npm run build` đạt trên máy cài đủ package.
