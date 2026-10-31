# Checklist V2.3.1 – Xòe 5 ngón

| Mã | Tình huống | Kết quả mong đợi |
|---|---|---|
| H01 | Xòe 5 ngón như ảnh người dùng, ngón cái sang ngang | Nhãn `XÒE 5 NGÓN · XÁC NHẬN` |
| H02 | Giữ pose H01 ~0,5 giây, đã nhập tên, camera READY | Idle -> Playing |
| H03 | Giữ pose liên tục | Không start/restart lặp |
| H04 | Xòe tay khi đang chơi | Chỉ hãm, không restart |
| H05 | Giơ ngón trỏ | `point`, nhắm đích |
| H06 | Giơ trỏ + giữa, các ngón khác co | `dash`, không start/restart |
| H07 | Nắm tay | `fist`, hãm |
| H08 | Mất vài kết quả nhận diện trong <115ms khi xòe | Không reset hold; chỉ kích hoạt sau frame open mới |
| H09 | Đổi sang các góc nghiêng, ánh sáng khác | Cần QA webcam thực tế; chưa đo được tỷ lệ chính xác |
| H10 | Tên người chơi trống | Có nhắc nhập tên; không khởi động bằng cử chỉ |

Tự động: npm test (116/116 PASS). Type-check core PASS. Browser/webcam thực tế: chờ QA.
