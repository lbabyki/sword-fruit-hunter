# Sword Fruit – Word Hunter V1.3.0

## Các yêu cầu đã triển khai

- Fullscreen bằng nút ngay trên khung game: **chỉ** workspace `game-workspace` gồm arena và sidebar camera/HUD/leaderboard vào fullscreen. Ẩn settings/notice trong chế độ này. Esc hoặc nút thoát sẽ khôi phục bình thường. Có phản hồi khi trình duyệt từ chối.
- Hai bảng xếp hạng **top 5**, giữ một bản ghi tốt nhất của mỗi người cho mỗi bảng.
- Điểm kết `score = baseScore + ((50 - rankSeconds) * 25)`; `rankSeconds = playSeconds + bombs * 5`. Không giới hạn điểm thưởng về 0 khi chậm hơn 50 giây. Lưu `baseScore`, `timeBonus`, `score` (điểm kết) và `scoringVersion=2`. Hiển thị phân rã trên modal kết quả và điểm tạm tính tại HUD.
- Bản ghi V1.2 trong localStorage tự quy đổi khi đọc; không cộng thưởng trùng khi đã có `scoringVersion=2`.
- Bộ nhận diện tư thế điều chỉnh theo tham khảo **38 ảnh** từ `finger_more.zip`: ngón chồng/nghiêng, DIP/PIP bị nhiễu, một ngón nhìn rõ, ngón tay bị ngắn trong ảnh. Xử lý `invalid` liên tục ≤85ms bằng giữ mục tiêu cũ giảm confidence; fist/open/lost lập tức chặn. Không làm chậm đường tín hiệu aim.

## Kiểm thử

- `npm test`: **50/50 PASS** (luật, leaderboard, lưu trữ, thử nghiệm gesture dựa trên landmark giả lập, scene Phaser mock, đồng bộ WASM mock).
- `tsc` riêng module luật chơi/lưu trữ/gesture: PASS; TypeScript/TSX parse: PASS.
- **Chưa chạy được** `npm run build` do container không có npm dependencies. Cũng chưa chạy end-to-end bằng webcam.
- 38 ảnh nguồn **chưa** được chạy MediaPipe inference hay dùng để train; cần kiểm thử hình ảnh thực tế.

## Nâng cấp từ V1.2

Dừng Vite. Giải nén hotfix từ gốc vào thư mục dự án và ghi đè. Chạy `npm install`, `npm test`, `npm run dev`, hard reload `Ctrl+Shift+R`. Không cần xóa dữ liệu localStorage.

## Đặc tả điểm mẫu

Điểm gốc = 3375; thời gian xếp hạng = 27,60 giây; thưởng = (50 - 27,60) * 25 = +560; **điểm kết = 3935**.
