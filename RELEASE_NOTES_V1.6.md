# Sword Fruit V1.6 – Bomb survival

- Added `bombGameOver` (default false) and `bombLimit` (0–20, default 3).
- Limit means *permitted* bomb hits: failure occurs on the next hit (`hits > limit`).
- Phaser camera shake on bomb collision (180 ms; small amplitude); collision coordinates unchanged.
- Failure freezes the game, displays result with partial score, never enters Top 5.
- Old saves remain compatible; ranking configuration distinguishes bomb-loss settings.
- Full logic regression suite: 74/74 PASS. Browser/Webcam QA not performed.
