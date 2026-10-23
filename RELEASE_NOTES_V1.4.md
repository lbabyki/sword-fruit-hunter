# Sword Fruit – Word Hunter V1.4.0 — Release Notes

**Checkpoint:** `SF-V1.4-ROUND_SETTINGS_PLAYER_NAME_SOURCE_READY_QA_PENDING`

## Chức năng mới

- **Màn hình CÀI ĐẶT**: nút ngay thanh mission phía trên arena; mở được cả trong chế độ fullscreen. Nếu đang chơi, game tự chuyển sang tạm dừng; cài đặt đã lưu chỉ áp dụng khi bắt đầu lượt mới. Trong khoảng chuyển từ, chờ 1,3 giây để mở.
- **Tên người chơi** được đưa về chính giữa thanh điều khiển dưới arena (hiện cả trong fullscreen). Bắt buộc nhập tên không rỗng trước khi bắt đầu; tên được nhớ trong localStorage, không đổi khi ván đang chơi.
- **Bom**: công tắc bật/tắt; 0 bom mỗi đợt dùng quota cổ điển theo chặng, 1–6 bom bổ sung cho mỗi đợt có hoa quả gây nhiễu mới. Việc spawn bom chỉ thực hiện khi có chỗ, theo kiểm tra va chạm dự đoán; không thả bom đơn lẻ nếu đợt không tạo được quả mới. Bom vẫn phạt +5 giây, mất combo.
- **Tốc độ**: hoa quả ×0,5–2,0 và kiếm ×0,5–2,0 (bước 0,1). Điều chỉnh trực tiếp khi bắt đầu ván từ cài đặt đã lưu.
- **Kéo dài màn chơi**: cộng 0/3/5/7/8/10/12/15 chữ thông qua *từ hoàn chỉnh* 3, 5, 7 chữ; tối đa 6 chặng và 30 chữ. Chặng bổ sung tiếp tục cộng điểm và combo.
- **Chữ tự do**: checkbox cho phép chém bất kỳ chữ nào còn thiếu; một chữ lặp vẫn yêu cầu đúng số lần trong từ, các ô chữ xanh theo đúng vị trí đã thu thập.
- **Mốc thời gian tính điểm** (30–300 giây, bước 5), **điểm/giây tiết kiệm** (0–100, bước 5): `điểm kết = điểm gốc + (mốc thời gian − thời gian xếp hạng) × điểm/giây`. Thời gian xếp hạng gồm phạt bom. Có thể trừ điểm nếu vượt mốc.
- **Quan trọng:** Mốc thời gian KHÔNG phải đồng hồ kết thúc ván; vượt mốc 50 giây vẫn được chơi đến khi hoàn thành đủ chữ.
- **Khôi phục mặc định**: một nút hoàn nguyên và lưu ngay các tham số gốc; các cài đặt khác có nút lưu riêng.
- **Bảng top 5**: tiếp tục hai bảng điểm cao và nhanh nhất; mỗi bảng chỉ hiển thị kết quả trong cùng chế độ chơi và cùng cấu hình độ khó/tính điểm. Thành tích V1.3 cũ vẫn xuất hiện trong cấu hình mặc định; không mất localStorage.

## Ghi chú kỹ thuật

- `src/components/GameSettingsScreen.tsx`: UI màn hình cấu hình.
- `src/game/settings.ts`: chuẩn hoá, giới hạn dữ liệu, localStorage, tính khóa cấu hình bảng xếp hạng, quy tắc chữ tự do và chặng bổ sung.
- `src/game/SwordFruitScene.ts`: đọc cấu hình snapshot ở đầu ván; cập nhật gameplay; **bỏ nhánh timeout tự động**.
- `src/App.tsx`: trạng thái cài đặt, điều khiển mở/lưu/đóng, tên người chơi trên thanh, hiển thị HUD/result/leaderboard có điều kiện.
- `src/game/types.ts`, `src/game/rules.ts`, `src/styles.css`: bổ sung kiểu dữ liệu và bố cục.

## Kiểm thử

- `npm test`: **63/63 PASS** (core + headless scene mock).
- `tsc` phần lõi `settings.ts`, `rules.ts`: **PASS**.
- Parser TypeScript/TSX trên toàn bộ `src`: **PASS**.
- **Chưa xác minh được `npm install`, `npm run build`, thao tác browser, fullscreen và camera thực tế** do môi trường không truy cập được npm registry. Phải thử trên máy người dùng.

## QA cần làm trên trình duyệt

1. Mở setting từ màn hình bình thường và fullscreen; chỉnh từng tham số; lưu; bắt đầu lượt mới kiểm tra thay đổi vận tốc/sinh bom/số chặng.
2. Mở setting khi đang chơi: game phải tạm dừng; nhấn đóng không tự phát lại; dùng nút Tiếp tục hoặc xòe 5 ngón. Cấu hình chỉ thay đổi sau lượt kế tiếp.
3. Chọn chém tự do rồi thử `APPLE`: chém `L`, `P`, `A`, `P`, `E` phải hoàn thành đúng 5 chữ; thử chém P lần thứ 3 bị tính sai.
4. Chơi qua 50 giây với mốc 50: không được tự kết thúc, có thể vẫn hoàn thành và thưởng âm. Chuyển sang mốc 90/120 và hệ số điểm khác, đối chiếu công thức.
5. Tắt bom: không có bom ở mọi chặng; bật 1–6 bom/đợt: bom chỉ kèm đợt sinh quả mới và có thể bị bỏ qua khi không đủ chỗ an toàn.
6. Hoàn thành màn 30 chữ; đồng hồ, ô chữ, HUD, chặng, màn kết quả và xếp hạng hiển thị đúng.
7. Thử nhập tên giữa thanh trong 1920×1080 và 1366×768, fullscreen; chữ không mất khi reload.
8. Kiểm tra top 5 trước đây vẫn còn khi chọn lại cài đặt mặc định, và không lẫn kết quả giữa hai cấu hình khác nhau.
9. Chạy `npm install`, `npm test`, `npm run build` trước khi bật camera. QA các cử chỉ một/hai ngón của V1.3 để bảo đảm không phát sinh regression.
