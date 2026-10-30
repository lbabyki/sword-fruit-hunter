# Release Notes V1.5.1

## Mục tiêu
Sửa việc nhận diện thiếu một dáng pose tay bổ sung trong `img_data`, gây mất điều khiển kiếm trong lúc chơi.

## Thay đổi chính
- Bổ sung heuristic `dominantForwardCandidate` trong `src/tracking/gestures.ts`.
- Khi góc khớp bị xẹp do ngón tay chĩa gần thẳng vào camera hoặc nằm ngang ra trước camera, hệ thống vẫn cố nhận ra đầu ngón trội nhất để xác định hướng và điểm ngắm.
- Giữ nguyên ưu tiên cho open-palm và fist, không tăng độ trễ điều khiển.
- Bổ sung 2 test mới cho pose foreshortened / near-camera.

## Kết quả kiểm thử
- 71/71 tests PASS.
- Không làm hỏng các pose cũ, combo, settings, âm thanh hay gameplay hiện tại.

## Phạm vi
Bản V1.5.1 chỉ xử lý **việc 1** theo thứ tự yêu cầu. Chưa triển khai việc 2 và 3.
