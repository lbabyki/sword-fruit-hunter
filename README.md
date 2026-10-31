# Sword Fruit V2.0 — Sword Fruit + Space Dodge

**Quick start:** install Node.js 22+, run `npm install`, `npm test`, `npm run dev`, then open `http://localhost:5173`. Webcam access requires HTTPS or localhost.

**Arcade:** select **⚔ SWORD FRUIT** or **🚀 SPACE DODGE** before starting a round. The current player's name and AI camera are shared. Settings and Top 5 rankings are distinct.

**V1.6 bomb rules:** Settings → Bom nổ kết thúc game, limit 0–20. Limit is the number of hits tolerated; 0 means the first hit ends the round, 3 means the fourth hit ends the round. Failed attempts are not added to Sword Fruit leaderboards. Camera shake lasts 180 ms.

**Space Dodge:** dodge rocks from the right, collect stars +100 points each, three lives by default, 1.2s invulnerability after a hit. Endless continues until all lives are lost; Score Challenge succeeds when the set point threshold is reached.

**Controls:** webcam fingertip aiming (single- and dual-finger), open five fingers to start/resume/retry, fist to brake. Keyboard demo uses WASD/arrows and SPACE to brake.

**Important:** MediaPipe assets are copied from the installed version by `scripts/sync-mediapipe-assets.mjs`. If install is incomplete, run `npm install` with network access first.

**Status:** source and headless tests completed; npm build and browser/webcam QA are pending. See `IMPLEMENTATION_STATUS_V2.0.md`.

---

# Sword Fruit — Word Hunter (Prototype V1.5.0)

Game chém hoa quả trong không gian để thu thập các chữ cái của từ tiếng Anh bằng kiếm điều khiển qua AI webcam.


**V1.5 — Âm thanh hiệu ứng:** Tạo 3 hiệu ứng âm thanh bằng Web Audio API cục bộ: tiếng lưỡi kiếm chém quả (đúng/sai), tiếng bom phát nổ, và tiếng nhấn nút. Không tải thêm thư viện hay file âm thanh. Mở **Cài đặt màn chơi → Bật âm thanh hiệu ứng** để bật/tắt, sau đó **Lưu cài đặt**. Mặc định âm thanh bật và lưu cùng cấu hình. Chế độ tắt tiếng không đổi điểm hay phân nhóm leaderboard. Trình duyệt có thể chặn audio cho đến khi người chơi nhấn nút lần đầu.

**V1.4 — Màn hình cài đặt và tên người chơi:** Nhấn `⚙ CÀI ĐẶT` ở thanh trên arena (hoạt động cả khi fullscreen). Điều chỉnh bật/tắt bom, 0–2 bom kèm các đợt quả mới, tốc độ quả/kiếm, thêm đến 15 chữ từ các từ hoàn chỉnh, checkbox chém chữ không theo thứ tự, mốc thời gian thưởng (50s mặc định) và điểm thưởng mỗi giây (25 mặc định). Có nút `KHÔI PHỤC MẶC ĐỊNH`; cấu hình được lưu trong localStorage, áp dụng từ ván tiếp theo. Đổi cài đặt khi đang chơi tự tạm dừng ván. Tên người chơi đặt giữa thanh dưới arena. **Mốc 50s chỉ phục vụ tính điểm, không dừng trò chơi.** Top 5 phân biệt theo cấu hình. Chi tiết xem `RELEASE_NOTES_V1.4.md`.

**V1.3 — Fullscreen / Top 5 / Time-Based Final Score / Pose Tolerance:** Nút `⛶ TOÀN MÀN HÌNH` tại thanh mission mở fullscreen chỉ cho vùng game và HUD bên phải (gồm camera và bảng xếp hạng), ẩn phần giới thiệu/cài đặt/footer. ESC thoát fullscreen. Bảng điểm và thời gian mở rộng top 5. Điểm kết thúc = **điểm gốc + (50 − thời gian xếp hạng) × 25**, trong đó thời gian xếp hạng đã bao gồm phạt bom. Nếu quá 50 giây, thành phần thưởng thời gian âm; không tự giới hạn về 0. Điểm kết là số thực tối đa 2 chữ số thập phân, dùng trong xếp hạng. Giao diện live vẫn hiển thị điểm gốc; khi kết thúc hiện điểm kết và giải thích phép tính. Dữ liệu V1.2 lưu cục bộ được chuyển đổi tương thích khi đọc.

Bộ tham chiếu `finger_more.zip` có **38 ảnh tư thế tay**. Bộ phân loại có thêm cơ chế chấp nhận ngón trỏ/giữa bị nghiêng, chồng ngón, nhiễu khớp giữa; chỉ giữ điểm ngắm cũ tối đa 85 ms đối với một frame `invalid` tạm thời. Open palm/fist/lost vẫn xử lý ngay. Không đưa ảnh vào runtime, **chưa huấn luyện hoặc benchmark MediaPipe trên 38 ảnh**; cần chạy webcam người thật để kiểm định đầy đủ.

**V1.2 — Fingertip Target, Single-Finger Fallback & Low-Latency Pipeline:** Ưu tiên vị trí **đầu ngón trỏ / ngón giữa** để định vị điểm ngắm trên vùng chơi; hướng từ khớp MCP đến đầu ngón được dùng để kéo điểm ngắm ra phía trước một khoảng nhỏ. Nếu chỉ một ngón đủ điều kiện trong ảnh (do khép/chồng/khuất ngón kia), dùng ngay đầu ngón đó thay vì loại cả cử chỉ. Khi cả hai ngón đáng tin cậy và cùng hướng, lấy trung bình có trọng số. Kiếm tiếp tục tự bay tới dấu ngắm (không teleport); xòe 5 ngón vẫn bắt đầu/tiếp tục/chơi lại; nắm tay vẫn hãm kiếm.

**Giảm độ trễ:** bỏ gate chờ 140 ms đối với cử chỉ ngắm, lọc vị trí theo tốc độ di chuyển kèm dự đoán giới hạn, ưu tiên nhận diện trong **Web Worker** và không xếp hàng các frame cũ. Nếu Worker không hoạt động, tự dùng MediaPipe luồng chính. HUD camera chỉ cập nhật khoảng 9 lần/giây; tín hiệu truyền tới vòng lặp game ngay khi có kết quả. Mục tiêu mượt/chậm trễ chưa được khẳng định đạt trên phần cứng thật.

**Lưu ý về "không gian":** webcam đơn không biết chính xác giao điểm tia ngón tay với một màn hình vật lý trong 3D. V1.2 điều khiển theo **vị trí đầu ngón được chiếu lên mặt phẳng camera + hướng ngón tay trong ảnh 2D**, cần tinh chỉnh gain/crop trên máy thật. Không được xem đó là phép đo tọa độ 3D chính xác.

## Công nghệ

- React 19 + TypeScript + Vite (giao diện)
- Phaser 3 (render 2D, game loop, va chạm kiếm)
- MediaPipe Tasks Vision Hand Landmarker (21 landmarks, chạy trên thiết bị)
- localStorage (leaderboard nội bộ trình duyệt)

## Chạy trên Windows / macOS / Linux

Yêu cầu: Node.js 22+ và Internet cho lần cài npm; Internet cũng cần để tải model Hand Landmarker khi khởi động AI lần đầu. **WASM được phục vụ cục bộ từ package npm đã cài**, không tải qua jsDelivr.

```bash
npm install
npm run dev
```

Mở URL do Vite hiển thị, thông thường `http://localhost:5173`. Chỉ chạy trên `localhost` hoặc HTTPS để cấp quyền camera. **Không** mở file `index.html` trực tiếp bằng `file://`.

```bash
npm test
npm run build
npm run preview
```

Có `start-windows.bat` để cài thư viện và mở dev server trên Windows.


## Sửa lỗi WASM 404 — V1.0.1

Bản V1.0 trước đây ghim sai CDN `@mediapipe/tasks-vision@0.10.22/wasm`: phiên bản ổn định đó không được phát hành, nên loader `vision_wasm_internal.js` trả về 404. Bản sửa ghim npm `@mediapipe/tasks-vision` ở **0.10.32**, dùng **WASM cùng version từ `node_modules`** và cho Vite tự phục vụ qua `/mediapipe/wasm/`.

Nếu đang chạy bản trước trên máy Windows, dừng Vite (`Ctrl+C`) rồi mở terminal ở thư mục dự án đã giải nén bản mới:

```powershell
npm install
npm run dev
```

Trong trình duyệt nhấn `Ctrl+Shift+R` để tải lại. Mở trực tiếp `http://localhost:5173/mediapipe/wasm/vision_wasm_internal.js` để kiểm tra loader trả về HTTP 200. Nếu thấy 404, chạy lại `npm run dev` và kiểm tra thông báo `MediaPipe 0.10.32: 4 WASM assets synchronized`.

Nếu cập nhật một dự án đã có `node_modules` từ bản cũ và gặp lệch phiên bản, chạy `npm install @mediapipe/tasks-vision@0.10.32 --save-exact` để đồng bộ lại dependency.

Không nên dùng giải pháp đổi CDN sang `@latest` vì phần JavaScript trong `node_modules` có thể khác phiên bản với file WASM từ CDN.

Tự động copy WASM chỉ giải quyết lỗi loader 404. Việc cấp quyền camera, tải model `.task`, WebGL/CPU và nhận diện tay trên máy thực tế cần kiểm thử riêng.

## Hướng dẫn chơi

1. Nhập tên người chơi.
2. Chọn **AI CAMERA**, bật camera và cho phép truy cập webcam.
3. Xòe **cả 5 ngón** trong khoảng 0,5 giây để **BẮT ĐẦU**. Mỗi lần xòe chỉ nhận một lần lệnh; hạ tay/khép lại trước khi xòe lần nữa.
4. Giơ **ngón trỏ và/hoặc ngón giữa**, co ngón áp út + út. Ưu tiên 2 đầu ngón khi đều nhìn rõ, nhưng vẫn nhắm bằng **1 ngón hợp lệ** nếu ngón kia bị khuất/chồng. Tọa độ đầu ngón và hướng chỉ tạo **điểm ngắm** trên vùng chơi; kiếm bay tới dấu ngắm. **Nắm tay để hãm**.
5. Khi tạm dừng, xòe 5 ngón để **TIẾP TỤC**. Sau khi hoàn thành toàn bộ từ, xòe 5 ngón để **CHƠI LẠI**. Xòe trong khi đang chơi sẽ chỉ hãm kiếm, **không reset tiến độ**.
6. Mặc định chém theo thứ tự các từ 3, 5, 7 chữ (15 chữ); có thể chỉnh để thêm các từ và cho phép chém chữ bất kỳ.
7. Combo +1 mỗi lần đúng, timer 3,5s; combo hết giờ hoặc chém sai sẽ về 0.
8. Bom cộng 5 giây và làm mất combo. Thời gian thi đấu là `thời gian chơi + 5s × số bom`.
9. Game ghi kết quả khi hoàn thành đủ tất cả các từ đã cấu hình. Mốc thời gian chỉ dùng thưởng/trừ điểm, không phải deadline.

**Không có webcam:** chọn **BÀN PHÍM** để kiểm tra gameplay. `WASD` hoặc các phím mũi tên để bay theo hướng tương ứng, `Space` để hãm. Lượt chơi này được lưu vào bảng luyện tập bàn phím, không được tính chính thức trong chế độ thi đấu webcam.

## Chế độ thi đấu & xếp hạng

- Luyện tập: bộ từ ngẫu nhiên, hạn chế lặp lại từ của lượt chơi trước.
- Thi đấu: cùng `seed=20261017` nhằm tạo các chuỗi ngẫu nhiên ban đầu có thể tái lập; **không bảo đảm độ khó tuyệt đối bằng nhau** nếu hành động người chơi làm thay đổi nhịp sinh vật thể. Có thể phát triển lịch spawn tiền tính cho giải đấu chính thức.
- Hai bảng top 5 được phân chia theo chế độ và cấu hình luật chơi; kết quả tùy chỉnh không trộn với thành tích cấu hình mặc định. Theo điểm giảm dần (hòa tính thời gian thấp hơn), và theo thời gian tăng dần (hòa tính điểm cao hơn).
- Giữ một thành tích tốt nhất mỗi tên người chơi trên từng bảng. Dữ liệu trong `localStorage` của **mỗi trình duyệt**, không đồng bộ nhiều máy.
- Nếu camera mất tracking >0,5 giây và game tạm dừng, lượt thi đấu được lưu nhưng không xếp hạng chính thức.

## Quy tắc gốc V1.2 (các tùy chỉnh V1.4 ghi ở phần đầu)

| Mục | Quy tắc |
|---|---|
| Logic arena | 1200 × 720, co giãn tự động |
| Spawn | 4 cạnh, quỹ đạo đi qua vùng giữa, sinh lại chữ bị bỏ lỡ |
| Target | Chỉ có một hoa quả mang đúng chữ cần tìm cùng lúc |
| Decoy | Tối đa 2 hoa quả chữ gây nhiễu |
| Bom | 0 / 1 / 2 bom được spawn ở ba chặng |
| Vật thể đồng thời | Không quá 4 |
| Thời gian vật thể | 4,75–5,8 giây |
| Camera aim | Định vị riêng đầu ngón trỏ; +20% vector từ MCP → TIP; crop 10% X/9% Y; gắn reticle |
| Xòe 5 ngón | Giữ 420ms sau khi xác nhận pose, giải phóng 240ms trước khi kích hoạt lại; khoảng cách 900ms giữa hai lần |
| Kiếm | V tối đa 520px/s, gia tốc 2600px/s², hãm 3300px/s² |
| Vận tốc tối thiểu chém | 130px/s |
| Combo | Thời gian 3,5s; `100+25×(combo−1)` điểm |
| Thưởng chặng | +100, +200, +300 |
| Điểm tối đa lý thuyết | 4.725 (15 chữ chém đúng liên tục) |
| Bom | +5 giây, mất combo; không trừ điểm |
| Sai chữ | Mất combo, không trừ điểm, không mất tiến độ |
| Kết thúc | Sau 3 từ hoàn thành |

## Kiến trúc nguồn

- `src/components/GameSettingsScreen.tsx`: màn hình cài đặt luật chơi.
- `src/game/settings.ts`: định dạng, kiểm tra, lưu tham số và xử lý thu thập chữ tự do.
- `src/game/rules.ts`: luật, tính điểm, xếp hạng, sinh quỹ đạo, hình học va chạm và vật lý kiếm (có unit tests).
- `src/game/SwordFruitScene.ts`: scene Phaser, vòng đời quả/bom, chém, vẽ hoạt ảnh và chu kỳ ba từ.
- `src/tracking/gestures.ts`: chỉ sử dụng ngón trỏ để ngắm; phân biệt trỏ + giữa để Dash; chiếu điểm ngắm từ đầu ngón trỏ + hướng, lọc thích ứng, chống lặp kích hoạt xòe năm ngón.
- `src/tracking/useHandTracking.ts`: webcam hook, worker/fallback, xử lý frame mới nhất, canvas skeleton, phát tín hiệu điều khiển trực tiếp và giới hạn React rerender.
- `src/tracking/handWorker.ts`: Web Worker chạy MediaPipe inference ngoài main thread khi khả dụng.
- `src/game/storage.ts`: lưu kết quả localStorage.
- `src/App.tsx`: UI HUD, camera, ba chặng, kết quả và leaderboard.
- `tests/*`: test logic chạy bằng Node (không cần cài npm package để chạy test cho luật chơi và cử chỉ (scene mock cần TypeScript cài cục bộ hoặc toàn cục)).

## Kết quả kiểm thử tại thời điểm đóng gói

- **63/63 bài test PASS**: gồm nhận diện/tính điểm ngắm, cử chỉ mở bàn tay, state game, WASM, luật điểm/hoa quả.
- **Type-check riêng phần core PASS** bằng `tsc`.
- **TS/TSX syntax pass** bằng TypeScript transpiler.
- Full Vite bundle và camera/WebGL thực tế **chưa được kiểm tra** vì môi trường không kết nối npm registry.

## Giới hạn & QA

1. Môi trường sinh mã không kết nối npm registry nên **chưa xác minh được `npm install`, typecheck hoặc trình duyệt chạy WebGL + webcam end-to-end**. Phải chạy `npm install && npm run build` trên máy có Internet rồi kiểm thử camera thực tế.
2. WASM MediaPipe được chép tự động từ `node_modules/@mediapipe/tasks-vision/wasm` vào `public/mediapipe/wasm` khi `npm install`, `npm run dev` hoặc `npm run build`. Model `.task` vẫn tải từ Google Storage; nếu cần chơi offline, tải model về `public/models` rồi điều chỉnh `MODEL` trong `useHandTracking.ts`.
3. Nhận diện ưu tiên Web Worker dùng `ImageBitmap` gửi tối đa một frame đang xử lý; nếu Web Worker không thể khởi tạo thì fallback về `detectForVideo()` trên main thread. Đo FPS/độ trễ bằng camera thật để xác định nhánh đang chạy và hiệu năng.
4. Cử chỉ ngón và xòe năm ngón được phân loại theo landmark + ngưỡng góc 2D (không huấn luyện classifier mới). Nếu MediaPipe trả thiếu hoặc sai landmark ở góc khuất cực đoan, không thể bảo đảm nhận đúng; cần QA bộ ảnh thực tế và video chuyển động trước khi đánh giá độ chính xác.
5. Phaser được dùng để render; va chạm lưỡi kiếm kiểm tra liên tục qua các điểm mẫu giữa hai frame. Để đạt độ chính xác cao hơn, cần kiểm tra swept polygon hoàn chỉnh.
6. Bảng xếp hạng hiện là **local prototype**. Muốn dùng thi đấu nhiều thiết bị cần backend lưu/kiểm chứng kết quả, đồng bộ thời gian và phòng chống sửa dữ liệu trình duyệt.
7. Seed cố định chỉ hỗ trợ tái lập nguồn random khi cùng hành vi game. Cần lịch quỹ đạo bất biến theo game clock nếu muốn so công bằng nghiêm ngặt.

## Bảo mật / quyền riêng tư

- Chỉ gọi webcam khi người chơi chủ động bật camera, có nút tắt ngay.
- Video được xử lý cục bộ bằng MediaPipe; mã nguồn này không gửi hình ảnh lên backend hoặc lưu frame camera.
- Kết quả chỉ lưu tại trình duyệt đang chơi (localStorage).

## QA bắt buộc cho V1.3 trên webcam

- Dùng tay phải và tay trái, chỉ/ngắm vào góc trái, phải, trên và dưới. Dấu ngắm phải đi đúng chiều bạn thấy trên camera **đã lật gương**.
- Giữ ngón tay gần như đứng yên: kiếm phải giảm tốc tại dấu ngắm, không tự bay ra khỏi màn hình.
- Đổi điểm ngắm đột ngột giữa hai phía: kiếm phải đổi hướng mượt, không nhảy tức thời.
- Xòe 5 ngón hơn nửa giây trên màn hình đầu: bắt đầu đúng một lần; giữ nguyên bàn tay không reset game.
- Nắm lại >240ms rồi xòe 5 ngón khi đang tạm dừng: tiếp tục; sau khi kết thúc: chơi lại.
- Kiểm tra độ sáng thấp, tay nghiêng, hai ngón quá sát, ngón cái bị che; tinh chỉnh các ngưỡng trong `src/tracking/gestures.ts` nếu cần.
- Nếu dấu ngắm chạy ngược chiều hoặc quá nhạy với camera của máy, kiểm tra `mirrored` và hệ số crop trong `pointingTarget()`.


## Dataset tư thế tay đã cung cấp và tiêu chí nghiệm thu V1.2

Archive `finger.zip` do người dùng cung cấp có **252 ảnh**: `down_point_finger_img` 74, `right_point_finger_img` 76, `left_point_finger_img` 50, `up_point_finger_img` 22, `finger_img` 30. Ảnh này dùng làm tham chiếu thiết kế các tình huống che khuất và góc nghiêng; **chưa đưa vào huấn luyện** và **chưa chạy model inference đánh giá từng ảnh**. Không cần đặt archive 158 MB vào thư mục game khi chạy.

Tiêu chí QA: (1) đầu ngón dịch phải/trái/lên/xuống → dấu ngắm và kiếm đi cùng chiều sau khi đối chiếu quy ước gương; (2) tư thế chỉ 1 ngón rõ vẫn ra `point` với nhãn `TRỎ` hoặc `GIỮA`; (3) giữ đứng yên không rung nhiều; (4) xoay hướng mà ít dịch MCP vẫn đổi điểm ngắm; (5) mở năm ngón không bị nhận thành point và kích hoạt một lần; (6) nắm tay lập tức hãm; (7) thử lặp lại khi worker bị vô hiệu để đo độ trễ fallback.

Dòng “TRỄ XỬ LÝ” hiển thị thời gian từ thời điểm game lấy video frame tới lúc nhận được landmark, **không phải độ trễ end-to-end tuyệt đối**: không tính buffer phần cứng webcam, latency màn hình và trễ chuyển động vật lý của kiếm.

Sau khi giải nén V1.2 vào dự án đang chạy, dừng Vite (`Ctrl+C`), chạy `npm install && npm run dev` rồi hard reload (`Ctrl+Shift+R`). Nếu cập nhật bằng hotfix, chỉ ghi đè đúng đường dẫn bên trong ZIP.


## Kiểm thử bắt buộc cho thay đổi V1.3

1. Nhấn `⛶ TOÀN MÀN HÌNH` để bật fullscreen của **khung game + sidebar**; topbar/intro/settings/footer phải biến mất khỏi vùng nhìn thấy. `Esc` phải thoát, các thành phần trở lại đúng bố cục ban đầu. Kiểm tra màn hình 1920×1080, 1366×768 và thay đổi kích thước; bảng top 5 có thể cuộn riêng bên phải.
2. Hoàn thành trò chơi **trong chế độ fullscreen**; modal kết quả phải nổi trên vùng fullscreen, không bị browser che. Khi đóng modal, leaderboard vẫn có thể mở/cuộn.
3. Giả định điểm gốc 3375, thời gian xếp hạng 27.60s: thưởng `(50 − 27.60) × 25 = 560`, điểm kết = **3935**. Thời gian 55s: thưởng **−125**, không tự chặn thành 0. Bom cộng +5s vào thời gian xếp hạng **trước** khi tính thưởng.
4. Xác minh top 5 trên cả 2 tab. Các bản ghi V1.2 trong localStorage được chuyển đổi sang công thức mới đúng một lần (không cộng bonus hai lần).
5. Thử từng chuỗi tư thế trong `finger_more.zip`: ngón trỏ đơn, ngón giữa đơn, hai ngón chồng, nghiêng cạnh, chuyển hướng, ngón nhìn ngắn do góc phối cảnh; đo tỷ lệ `point`, sai hướng và độ trễ bằng video có ground truth. Không thể tuyên bố nhận diện chính xác cả 38 ảnh chỉ từ unit test landmark giả lập.
6. Nắm tay phải hãm ngay; xòe năm ngón đủ lâu kích hoạt lệnh một lần; cử chỉ `invalid` liên tục quá 85 ms phải ngừng giữ mục tiêu cũ.

**Hạn chế kiểm chứng hiện tại:** `npm test` và typecheck lõi chạy được trong môi trường tạo mã, nhưng `npm run build` chưa chạy do chưa có `node_modules/@mediapipe/tasks-vision` để đồng bộ WASM. Trên Windows, chạy `npm install`, `npm test`, `npm run build` rồi QA webcam thật.


---

## Space Dodge V2.2 – Advanced Settings & Advanced Gameplay

Bản V2.2 được phát triển từ mã nguồn V2.0. Sword Fruit (thu thập chữ, combo, bom và điểm kết) được giữ nguyên.

### Cài đặt Space Dodge

Mở **SPACE DODGE → CÀI ĐẶT**. Các tab gồm: Luật chơi, Thiên thạch, Phi thuyền, Sao & điểm, Kỹ năng, Điều khiển AI, Hiệu ứng.

- Preset: Easy / Normal / Hard / Extreme / Custom; lưu/tải/xóa preset đặt tên trong trình duyệt.
- Điều chỉnh số mạng 1–10, mốc điểm 100–10.000, thời hạn 0–600 giây (0 = không giới hạn), thời gian bất tử 0–3 giây.
- Thiên thạch: tốc độ 0,5–3×, khoảng sinh 0,5–4 giây, trần đồng thời 1–12, kích thước 0,5–2×, trọng số ba quỹ đạo, tăng độ khó theo chu kỳ, Heavy/Cluster/Splitter/Meteor Wave.
- Phi thuyền: tốc độ, gia tốc, hãm, hitbox và xoay theo vận tốc.
- Sao: bật/tắt, điểm mỗi sao, tần suất, số lượng, tốc độ, combo +25 mỗi bậc, sao đặc biệt, Risk Star.
- Shield: vật phẩm khiên tự xuất hiện không thường xuyên, chặn một lần va chạm; không cộng dồn nhiều khiên.
- Dash: khi đã bật trong Settings, **giơ thêm ngón giữa cùng ngón trỏ** khoảng 120ms để lao theo điểm ngắm ngón trỏ/hướng trước đó. Không lặp trong một lần giơ tay. Dash dài 0,22 giây, cooldown mặc định 3 giây; ở chế độ bàn phím dùng **Shift**.
- Near Miss: thưởng +20 khi né sát thiên thạch một lần; Meteor Wave: tăng mật độ khoảng 20–26 giây trong mỗi chu kỳ 30 giây.
- Điều khiển AI: độ nhạy, hiệu chuẩn hai điểm bằng webcam; chỉ là ánh xạ 2D, KHÔNG phải suy ra tia nhìn 3D chính xác.
- Hiệu ứng: âm lượng riêng Space Dodge (bật/tắt âm thanh dùng chung), rung, vệt động cơ/thiên thạch, hiển thị cảnh báo sát cạnh phải và giảm chuyển động.

### Thời gian và bảng điểm

- Endless: hết mạng kết thúc; nếu đặt giới hạn thời gian, sống đủ thời gian là hoàn thành thử thách.
- Score Challenge: đạt đủ điểm là thắng; hết thời gian hoặc hết mạng trước khi đủ điểm là thua.
- Top 5 tách theo mode và các thiết lập có ảnh hưởng gameplay. Cài đặt chỉ hiệu ứng không làm đổi nhóm leaderboard.
- Các lượt chơi đang chạy sẽ không bị reset nếu mở Settings; thay đổi độ khó áp dụng ở lượt mới.

### Kiểm thử

Chạy `npm install`, `npm test`, `npm run build`, `npm run dev`. Trong môi trường tạo mã, 103 bài kiểm thử logic đạt; chưa xác minh build Vite đầy đủ do không tải được dependencies từ npm registry. Cần QA trực tiếp với webcam để hiệu chỉnh pose ngón trỏ + ngón giữa, tốc độ phản hồi và khả năng né ở thiết lập cao.


## V2.3 – Đơn giản hóa nhận diện tay (cập nhật mới nhất)

**Quy tắc V2.3 thay thế hướng dẫn cử chỉ trong các phần V1.2–V2.2 ở trên.** Không có bước fine-tune/training lại MediaPipe: phiên bản trước chỉ thêm điều kiện phân loại landmark, gây xung đột khi nhận diện tư thế.

- **Ngón trỏ** (landmark 5–8): điểm ngắm duy nhất cho cả kiếm và phi thuyền, không dùng vị trí ngón giữa làm mục tiêu.
- **Ngón trỏ + ngón giữa** (landmark 9–12): giữ điểm ngắm của ngón trỏ, kích hoạt Dash khi ở Space Dodge, đã bật kỹ năng và giữ đủ 120 ms; không lặp khi chưa thả pose.
- **Ngón giữa đứng riêng, ngón út riêng**: không điều khiển và không kích hoạt Dash.
- **Xòe năm ngón**: bắt đầu / tiếp tục / chơi lại; **nắm tay**: hãm.
- Nhận diện ưu tiên khớp 3D `worldLandmarks` khi có để kiểm tra ngón trỏ/góc co duỗi khi tay hướng vào camera. Vẫn dùng vị trí đầu ngón trỏ từ khung hình 2D cho điểm ngắm.
- Bộ lọc mục tiêu vẫn giữ tính liên tục khi đổi pose trỏ → trỏ + giữa. Thời gian giữ Dash dựa trên timestamp của **các kết quả camera mới**, không đếm lặp 60 FPS render thành thời gian giữ.
- **Không bảo đảm đúng tất cả góc nhìn bằng một webcam 2D**, đặc biệt khi ngón trỏ bị che hoặc chỉ hoàn toàn vào ống kính. Đây là hạn chế đầu vào/landmark cần QA thực tế.
- Chạy: `npm install`, `npm test`, `npm run build`, `npm run dev`. Model & asset WASM cần tải/cài thành công trước khi QA.

### V2.3.1 – Sửa xòe 5 ngón không bắt đầu

Nếu webcam đã hiển thị skeleton nhưng nhãn báo “TRỎ + GIỮA · DASH” dù đang xòe toàn bàn tay, nâng cấp V2.3.1. Bộ phân loại nay nhận ngón cái xòe ngang và chịu được lỗi suy luận một vài khung hình. **Nhập tên người chơi trước khi thực hiện cử chỉ bắt đầu.** Xem `RELEASE_NOTES_V2.3.1.md` để kiểm thử. Model MediaPipe không được huấn luyện lại trong bản này; chỉ sửa quy tắc suy luận landmarks.
