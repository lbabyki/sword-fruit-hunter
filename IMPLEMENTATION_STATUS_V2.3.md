# Implementation Status V2.3 – Gesture simplification

## Yêu cầu và tình trạng

| Mã | Yêu cầu | Trạng thái mã nguồn | Kiểm thử | Cần QA webcam |
|---|---|---|---|---|
| R1 | Chỉ ngón trỏ điều khiển kiếm | Đã triển khai | PASS logic | Có |
| R2 | Chỉ ngón trỏ điều khiển phi thuyền | Đã triển khai | PASS logic | Có |
| R3 | Ngón giữa một mình không còn điều khiển | Đã triển khai | PASS | Có |
| R4 | Giơ thêm ngón giữa khi đang chỉ bằng trỏ để Dash | Đã triển khai ở Space Dodge | PASS logic | Có |
| R5 | Không còn ngón út → Dash | Đã loại bỏ nhánh | PASS | Có |
| R6 | Giữ target theo đầu ngón trỏ khi chuyển sang pose Dash | Đã triển khai | PASS | Có |
| R7 | Góc nghiêng/phối cảnh: tận dụng MediaPipe worldLandmarks 3D để kiểm tra độ duỗi ngón | Đã triển khai đường truyền & fallback | PASS synthetic landmarks | **Chưa benchmark webcam** |
| R8 | Chặn Dash lặp khi giữ pose; giữ 120 ms theo inference mới | Đã triển khai | PASS stale frame test | Có |
| R9 | Xòe năm ngón bắt đầu/tiếp tục/chơi lại; nắm tay hãm | Giữ nguyên | PASS regression | Có |
| R10 | Không phá vỡ luật chơi, Settings, bom, sao, Shield, Top 5 và âm thanh | Giữ nguyên các phần liên quan | PASS suite | Có |
| R11 | Kiểm tra hiện tượng model nhận diện kém sau thêm skill | Đã đối chiếu logic V2.2, xác định xung đột quy tắc cử chỉ và nguồn target | Code review | **Cần đo trên dữ liệu thật** |

## Chẩn đoán quan trọng

V2.2 không train/fine-tune model MediaPipe mới; các skill mới được bổ sung bằng **bộ luật xử lý landmark ở tầng ứng dụng**. Phân loại nhiều cử chỉ và lấy ngón trỏ/ngón giữa/ngón út làm nguồn mục tiêu làm hệ thống phức tạp, dễ sai khi chồng ngón hoặc nhìn nghiêng. V2.3 sử dụng ngón trỏ làm nguồn target duy nhất và ngón giữa làm trạng thái skill, tách hai trách nhiệm.

## Kết quả kiểm tra

- `npm test`: **109/109 PASS**.
- Kiểm tra cú pháp: **16 tệp TypeScript/TSX, 0 lỗi parser**.
- Type-check các module logic độc lập: **PASS**.
- **Chưa thể thực hiện `npm run build` đầy đủ** trong môi trường hiện tại vì npm registry không truy cập được (`EAI_AGAIN`).
- **Chưa đo precision/recall hay latency trên webcam thật**. Không tuyên bố đã cải thiện được tỷ lệ nhận diện thực tế cho mọi góc nhìn.

## Phạm vi nâng cấp

Nâng cấp trực tiếp từ V2.2 sang V2.3. Dữ liệu `localStorage` và bảng điểm không bị xóa; cấu hình Dash hiện có được giữ nguyên. Không thay đổi luật chơi, bảng xếp hạng hoặc điểm thưởng.

## Checklist nghiệm thu

Xem `QA_CHECKLIST_V2.3.md` để kiểm tra chỉ ngón trỏ theo tám hướng, ngón giữa riêng, Dash đúng 120 ms qua inference, open palm/fist và hiệu năng trên webcam.
