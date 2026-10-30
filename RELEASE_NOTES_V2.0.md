# Sword Fruit V2.0 — Dual Arcade

## V1.6 Bomb Survival (included)
- Optional instant game over after *more than* 0–20 permitted bomb hits (default off; limit 3).
- Bomb shakes only Phaser camera for 180 ms. Does not change collision coordinates or webcam tracking.
- Failed Sword Fruit round displays a Game Over modal and never adds a score to Top 5.
- Legacy custom leaderboard keys remain unchanged when new failure settings use defaults.

## Space Dodge — New game mode
- In-app game switcher between Sword Fruit and Space Dodge, available when no round is active.
- Separate Phaser SpaceDodgeScene, shares MediaPipe gestures and Web Audio system.
- Spaceship follows fingertip cursor with speed, acceleration and braking, can also use WASD / arrows.
- Meteors originate outside the right edge; move horizontally, down-left or up-left; edge paths permitted.
- Three lives by default; collision removes one, 1.2 s temporary invulnerability; no repeated life loss during invulnerability.
- Collectible stars add 100 points. Endless mode ends when out of lives; Goal mode succeeds at selected score, loses when out of lives.
- Meteor difficulty increases in capped 30s steps; separate Settings for goal/lives/speeds/progression, with shared sound preference.
- Independent Top 5 per difficulty profile and Space mode. Endless ranks highest score then longest survival; Score Challenge ranks fastest successful completion then more remaining lives.
- Shared player name, fullscreen workspace, camera and existing five-finger start/resume/restart.

## Validation
- Logic tests cover both game modes, route types, swept collisions, invulnerability, goal/endless outcomes and legacy rules.
- Full npm install, Vite production build, webcam FPS and browser/audio rendering were NOT verified in this container because dependencies could not be downloaded.
