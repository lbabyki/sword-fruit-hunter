# Sword Fruit — Word Hunter V1.1.0

## Thay đổi theo yêu cầu

1. **Fingertip target steering:** AI lấy trung điểm hai đầu ngón trỏ (landmark 8) + ngón giữa (12), đồng thời tính hướng từ hai gốc (5, 9) tới đầu ngón. Từ đó chiếu thành điểm ngắm 2D trên màn chơi, có lật gương theo webcam và giới hạn/crop trong vùng chơi. Kiếm bay **về điểm đích**, thay vì luôn bay theo vector hướng hai ngón.
2. Kiếm **không teleport** tới dấu ngắm: vẫn có gia tốc, vận tốc tối đa, quán tính, giảm tốc ở gần mục tiêu. Dấu ngắm xanh xuất hiện khi pose hai ngón hợp lệ.
3. **Xòe đủ 5 ngón** để điều khiển vòng đời game:
   - Đang chờ (idle): bắt đầu.
   - Tạm dừng (paused): tiếp tục.
   - Đã hoàn thành (finished): chơi lại từ đầu.
   - Đang chơi (playing)/chuyển chặng (between): không khởi động lại ván.
4. Xòe năm ngón cần giữ khoảng 0,5 giây; giới hạn một sự kiện/lần xòe, phải thu tay và xòe lại để kích hoạt lệnh tiếp theo.
5. Nắm tay vẫn hãm kiếm; chế độ bàn phím vẫn giữ WASD/mũi tên và phím Space.
6. Không thay đổi luật điểm, combo, bom, từ ngữ, lưu bảng xếp hạng.

## Cài đặt

```powershell
npm install
npm run dev
```

Mở `http://localhost:5173`, nhấn BẬT CAMERA AI. Trước khi chơi, nhìn vào dấu ngắm, đưa ngón tay đến các phía trong khung hình để kiểm tra dấu ngắm phản hồi đúng; sau đó mở cả năm ngón để bắt đầu.

## Kiểm thử

- `npm test`: **34/34 PASS** trên môi trường hiện tại.
- Kiểm tra cú pháp TypeScript/TSX: **6/6 PASS**.
- Chưa thể xác minh `npm run build` end-to-end vì môi trường không có `node_modules`/không cài được npm từ registry.
- Webcam, hiệu chỉnh pose, latency và cảm giác chuyển động cần xác nhận trên máy người chơi.

## Tinh chỉnh nếu cần

- `src/tracking/gestures.ts`: `pointingTarget()` — tỷ lệ crop của camera (`.13/.74`, `.10/.80`), độ phóng về phía đang chỉ (`.38`), đảo gương.
- `src/tracking/gestures.ts`: `GestureSmoother` — `alpha=.42` cho lọc vị trí điểm ngắm.
- `src/tracking/gestures.ts`: `OpenPalmTrigger` — ngưỡng giữ/nhả/ngăn lặp (`420/240/900ms`).
- `src/game/rules.ts`: `steerSwordToTarget()` — bán kính dừng 14px và mức giảm tốc dựa trên khoảng cách.

**Giới hạn quan trọng:** Webcam 2D không cho phép xác định chính xác giao điểm của hướng ngón tay trong không gian 3D với mặt phẳng màn hình. V1.1 dùng điểm ngắm 2D xấp xỉ từ vị trí và hướng ngón, có thể điều khiển bằng cách di chuyển/đổi hướng tay. Nếu cần ngắm mục tiêu chính xác kiểu laser pointing theo 3D, phải bổ sung bước calibration hoặc mô hình ước lượng hướng 3D.
