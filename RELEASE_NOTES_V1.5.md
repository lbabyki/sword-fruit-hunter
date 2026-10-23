# Release Notes — Sword Fruit V1.5.0

## Âm thanh

- Tiếng **chém hoa quả**: tiếng chém nhanh và âm lấp lánh (bao gồm khi chém chữ sai).
- Tiếng **chém bom**: tiếng nổ trầm riêng biệt, phạt giờ/combo như trước.
- **Nút giao diện**: click SFX cho tất cả button trong màn hình chính, Settings, hướng dẫn và bảng kết quả. Các nút disabled không phát tiếng.
- **Cài đặt màn chơi > Bật âm thanh hiệu ứng**: bật mặc định, tắt khi cần. Nhấn **Lưu cài đặt** (hoặc **Khôi phục mặc định**) để áp dụng ngay và lưu localStorage. Thay đổi này không reset lượt đang chơi.

## Thiết kế kỹ thuật

- Web Audio API tổng hợp âm thanh, không tải thêm file, tránh network/decoding latency.
- Giới hạn âm lượng bằng master gain; thời gian âm thanh: nút ~64ms, chém quả ~160ms, bom ~420ms.
- Tái sử dụng buffer noise giữa các lượt chém; kích hoạt AudioContext sau tương tác người dùng theo chính sách autoplay trình duyệt.
- Audio không tham gia vòng lặp cập nhật UI React, việc mất audio không làm ngưng game.
- Tắt audio **không** làm thay đổi phân bảng xếp hạng và công thức điểm.

## Kiểm thử

Chạy `npm test` và `npm run build` sau khi cài dependencies. Các bài kiểm thử Node mô phỏng được Web Audio nhưng chưa thay thế xác nhận loa/âm thanh trình duyệt thật.
