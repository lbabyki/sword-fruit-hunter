/** Player-selectable round settings. Values are snapshotted at the start of a round. */
export const EXTRA_LETTERS = [0, 3, 5, 7, 8, 10, 12, 15] as const;
export type ExtraLetters = (typeof EXTRA_LETTERS)[number];
export type GameSettings = {
  bombsEnabled: boolean;
  /** User audio preference; does not affect competition difficulty or score. */
  soundEnabled: boolean;
  /** Number of extra bombs synchronized with each new decoy-fruit wave. 0 = classic stage quotas. */
  bombsPerWave: number;
  fruitSpeed: number;
  swordSpeed: number;
  extraLetters: ExtraLetters;
  unorderedLetters: boolean;
  /** Reference time for final scoring, NOT a gameplay timeout. */
  scoreTimeSeconds: number;
  pointsPerSecond: number;
};
export const DEFAULT_SETTINGS: Readonly<GameSettings> = Object.freeze({
  bombsEnabled: true,
  soundEnabled: true,
  bombsPerWave: 0,
  fruitSpeed: 1,
  swordSpeed: 1,
  extraLetters: 0,
  unorderedLetters: false,
  scoreTimeSeconds: 50,
  pointsPerSecond: 25,
});
const STORAGE_KEY = "sword-fruit:game-settings:v1";
const bounded = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
  step = 1,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const clamped = Math.max(min, Math.min(max, value));
  return Number((Math.round(clamped / step) * step).toFixed(4));
};
export function normalizeSettings(raw: unknown): GameSettings {
  const s =
    raw && typeof raw === "object" ? (raw as Partial<GameSettings>) : {};
  return {
    bombsEnabled: typeof s.bombsEnabled === "boolean" ? s.bombsEnabled : true,
    soundEnabled: typeof s.soundEnabled === "boolean" ? s.soundEnabled : true,
    bombsPerWave: bounded(s.bombsPerWave, 0, 6, 0),
    fruitSpeed: bounded(s.fruitSpeed, 0.5, 3, 1, 0.1),
    swordSpeed: bounded(s.swordSpeed, 0.5, 2, 1, 0.1),
    extraLetters: EXTRA_LETTERS.includes(s.extraLetters as ExtraLetters)
      ? (s.extraLetters as ExtraLetters)
      : 0,
    unorderedLetters:
      typeof s.unorderedLetters === "boolean" ? s.unorderedLetters : false,
    scoreTimeSeconds: bounded(s.scoreTimeSeconds, 30, 300, 50, 5),
    pointsPerSecond: bounded(s.pointsPerSecond, 0, 100, 25, 5),
  };
}
export function isDefaultSettings(settings: GameSettings): boolean {
  return Object.keys(DEFAULT_SETTINGS)
    .filter((k) => k !== "soundEnabled")
    .every(
      (k) =>
        settings[k as keyof GameSettings] ===
        DEFAULT_SETTINGS[k as keyof GameSettings],
    );
}
/** Rankings ignore sound preferences: muting has no effect on difficulty or scoring. */
export function settingsKey(settings: GameSettings): string {
  const s = normalizeSettings(settings);
  if (isDefaultSettings(s)) return "classic-v1.3";
  return `custom-v1.4:${Number(s.bombsEnabled)}:${s.bombsPerWave}:${s.fruitSpeed}:${s.swordSpeed}:${s.extraLetters}:${Number(s.unorderedLetters)}:${s.scoreTimeSeconds}:${s.pointsPerSecond}`;
}
export function loadSettings(): GameSettings {
  try {
    return normalizeSettings(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"),
    );
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
export function persistSettings(settings: GameSettings): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizeSettings(settings)),
  );
}
/** Extra letters are added only by composing complete three-, five- and seven-letter words. */
export function extraWordLengths(extraLetters: ExtraLetters): number[] {
  switch (extraLetters) {
    case 0:
      return [];
    case 3:
      return [3];
    case 5:
      return [5];
    case 7:
      return [7];
    case 8:
      return [3, 5];
    case 10:
      return [3, 7];
    case 12:
      return [5, 7];
    case 15:
      return [3, 5, 7];
  }
}
/** Returns the unique position occupied by a successful hit, including repeated letters. */
export function findCollectibleIndex(
  word: string,
  collectedIndices: readonly number[],
  letter: string,
  unordered: boolean,
): number {
  if (!word || !letter) return -1;
  const occupied = new Set(collectedIndices);
  if (!unordered) {
    const next = word.split("").findIndex((_, i) => !occupied.has(i));
    return next >= 0 && word[next] === letter ? next : -1;
  }
  return word.split("").findIndex((x, i) => x === letter && !occupied.has(i));
}
export function remainingLetters(
  word: string,
  collectedIndices: readonly number[],
): string[] {
  const occupied = new Set(collectedIndices);
  return word.split("").filter((_, i) => !occupied.has(i));
}
