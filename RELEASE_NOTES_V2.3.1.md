# Sword Fruit / Space Dodge V2.3.1 – Open Palm Start Fix

## Lỗi
Ở V2.3, cử chỉ xòe 5 ngón trong webcam có thể bị phân loại `dash` thay vì `open`. Ảnh người dùng cung cấp cho thấy rõ cả năm ngón và các MediaPipe landmarks đã phát hiện bàn tay, nhưng UI vẫn hiển thị “TRỎ + GIỮA · DASH”.

## Nguyên nhân trong mã
`classifyHand` trước đây chỉ chấp nhận cử chỉ `open` khi các góc của bốn ngón đều >153° và ngón cái thỏa hai ngưỡng duỗi rất cao. Ngón cái mở ngang hoặc một landmark 3D nhiễu làm toàn bộ phép kiểm tra thất bại; sau đó nhánh index+middle lại trả `dash`. `OpenPalmTrigger` cũng reset thời gian giữ mỗi khi có một kết quả nhận diện chập chờn.

## Thay đổi
- `src/tracking/gestures.ts`: thêm `isFullOpenPalm` với các kiểm tra mở cả bốn ngón (góc 2D hoặc góc 3D, độ vươn và vị trí đầu ngón so với cổ tay). Ngón cái được đánh giá bằng độ xòe ngang và khoảng cách tới lòng bàn tay, không bắt buộc phải thẳng tuyệt đối.
- Phân loại `open` **trước** `dash`; hai ngón trỏ+giữa vẫn kích hoạt `dash` khi các ngón còn lại không xòe.
- `OpenPalmTrigger`: chịu lỗi nhận diện thoáng qua tối đa 115ms, vẫn giữ yêu cầu xòe khoảng 420ms và chỉ kích hoạt một lần mỗi lần xòe/thả. Khung hình sai không thể tự kích hoạt bắt đầu.
- `src/App.tsx` và `src/styles.css`: nhắc nhập tên người chơi nếu chưa nhập, vì tên trống cũng ngăn bắt đầu dù đã nhận diện đúng `open`.
- Không thay đổi hệ số tốc độ AI, pipeline MediaPipe, luật chơi, kỹ năng Dash, điểm hoặc bảng xếp hạng.

## Test
- `npm test`: **116/116 PASS**, tăng 7 bài test so với V2.3.
- Type-check độc lập `src/tracking/gestures.ts` và `src/game/rules.ts`: PASS.
- Chưa thể chạy `npm run build` vì môi trường chưa có `node_modules/@mediapipe/tasks-vision`; lỗi xảy ra trước khi Vite biên dịch.
- Không khẳng định tỷ lệ nhận diện thật trên webcam đã được đo: các bài test sử dụng landmarks mô phỏng, gồm một bộ tọa độ xấp xỉ ảnh người dùng.

## Hướng dẫn QA trực tiếp
1. Nhập tên người chơi; bật camera, đảm bảo trạng thái `READY`.
2. Xòe cả 5 ngón với ngón cái sang ngang như ảnh, giữ khoảng 0,5 giây. Nhãn phải là `XÒE 5 NGÓN · XÁC NHẬN`, game phải bắt đầu.
3. Trong lúc chơi, xòe tay không được reset game.
4. Chỉ giơ ngón trỏ: điều khiển kiếm/phi thuyền. Giơ thêm ngón giữa: Dash trong Space Dodge.
5. Giữ hai ngón trỏ+giữa mà không xòe các ngón khác: không được bị nhận là xòe 5 ngón.
6. Nắm tay: hãm. Thử webcam ở nhiều góc tay và ánh sáng khác nhau.
7. Khi kết thúc hoặc tạm dừng, phải xòe lại sau khi đã thả tay để kích hoạt một lần tiếp theo.

## Checkpoint
`SF-V2.3.1-OPEN_PALM_CLASSIFIER_FIXED_LOGIC_PASS_WEBCAM_QA_PENDING`
