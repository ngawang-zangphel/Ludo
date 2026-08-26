import {
  BoardCoordinate,
  PlayerColor,
} from '@ludo-game/shared-types';

/**
 * Shared 52-square loop, clockwise, starting at RED's start square.
 *
 * Visual layout (row 0 = top):
 *
 *   GREEN yard (NW)              YELLOW yard (NE)
 *   RED yard (SW)                BLUE yard (SE)
 *
 * RED start is on the bottom arm, left track column, just outside the red yard.
 */
export const COMMON_PATH: readonly BoardCoordinate[] = [
  { row: 13, col: 6 }, // 0  RED start
  { row: 12, col: 6 },
  { row: 11, col: 6 },
  { row: 10, col: 6 },
  { row: 9, col: 6 },
  { row: 8, col: 5 },
  { row: 8, col: 4 },
  { row: 8, col: 3 },
  { row: 8, col: 2 }, // 8  star
  { row: 8, col: 1 },
  { row: 8, col: 0 },
  { row: 7, col: 0 },
  { row: 6, col: 0 },
  { row: 6, col: 1 }, // 13 GREEN start
  { row: 6, col: 2 },
  { row: 6, col: 3 },
  { row: 6, col: 4 },
  { row: 6, col: 5 },
  { row: 5, col: 6 },
  { row: 4, col: 6 },
  { row: 3, col: 6 },
  { row: 2, col: 6 }, // 21 star
  { row: 1, col: 6 },
  { row: 0, col: 6 },
  { row: 0, col: 7 },
  { row: 0, col: 8 },
  { row: 1, col: 8 }, // 26 YELLOW start
  { row: 2, col: 8 },
  { row: 3, col: 8 },
  { row: 4, col: 8 },
  { row: 5, col: 8 },
  { row: 6, col: 9 },
  { row: 6, col: 10 },
  { row: 6, col: 11 },
  { row: 6, col: 12 }, // 34 star
  { row: 6, col: 13 },
  { row: 6, col: 14 },
  { row: 7, col: 14 },
  { row: 8, col: 14 },
  { row: 8, col: 13 }, // 39 BLUE start
  { row: 8, col: 12 },
  { row: 8, col: 11 },
  { row: 8, col: 10 },
  { row: 8, col: 9 },
  { row: 9, col: 8 },
  { row: 10, col: 8 },
  { row: 11, col: 8 },
  { row: 12, col: 8 }, // 47 star
  { row: 13, col: 8 },
  { row: 14, col: 8 },
  { row: 14, col: 7 },
  { row: 14, col: 6 }, // 51 last square before RED start / RED home entry
];

export const COLOR_START_INDEX: Record<PlayerColor, number> = {
  [PlayerColor.RED]: 0,
  [PlayerColor.GREEN]: 13,
  [PlayerColor.YELLOW]: 26,
  [PlayerColor.BLUE]: 39,
};

/** Star squares: 8 steps after each start. Combined with starts they form the 8 safe cells. */
export const STAR_INDICES: readonly number[] = [8, 21, 34, 47];

export const START_INDICES: readonly number[] = [0, 13, 26, 39];

export const SAFE_INDICES: ReadonlySet<number> = new Set([
  ...START_INDICES,
  ...STAR_INDICES,
]);

export const HOME_PATHS: Record<PlayerColor, readonly BoardCoordinate[]> = {
  [PlayerColor.RED]: [
    { row: 13, col: 7 },
    { row: 12, col: 7 },
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
  ],
  [PlayerColor.GREEN]: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
  ],
  [PlayerColor.YELLOW]: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
  ],
  [PlayerColor.BLUE]: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
  ],
};

export const HOME_TRIANGLES: Record<PlayerColor, BoardCoordinate> = {
  [PlayerColor.RED]: { row: 8, col: 7 },
  [PlayerColor.GREEN]: { row: 7, col: 6 },
  [PlayerColor.YELLOW]: { row: 6, col: 7 },
  [PlayerColor.BLUE]: { row: 7, col: 8 },
};

export const CENTER_COORDINATE: BoardCoordinate = { row: 7, col: 7 };

export const YARD_SLOTS: Record<PlayerColor, readonly BoardCoordinate[]> = {
  [PlayerColor.RED]: [
    { row: 10, col: 1 },
    { row: 10, col: 4 },
    { row: 13, col: 1 },
    { row: 13, col: 4 },
  ],
  [PlayerColor.GREEN]: [
    { row: 1, col: 1 },
    { row: 1, col: 4 },
    { row: 4, col: 1 },
    { row: 4, col: 4 },
  ],
  [PlayerColor.YELLOW]: [
    { row: 1, col: 10 },
    { row: 1, col: 13 },
    { row: 4, col: 10 },
    { row: 4, col: 13 },
  ],
  [PlayerColor.BLUE]: [
    { row: 10, col: 10 },
    { row: 10, col: 13 },
    { row: 13, col: 10 },
    { row: 13, col: 13 },
  ],
};

export const YARD_BOUNDS: Record<
  PlayerColor,
  { rowStart: number; rowEnd: number; colStart: number; colEnd: number }
> = {
  [PlayerColor.RED]: { rowStart: 9, rowEnd: 14, colStart: 0, colEnd: 5 },
  [PlayerColor.GREEN]: { rowStart: 0, rowEnd: 5, colStart: 0, colEnd: 5 },
  [PlayerColor.YELLOW]: { rowStart: 0, rowEnd: 5, colStart: 9, colEnd: 14 },
  [PlayerColor.BLUE]: { rowStart: 9, rowEnd: 14, colStart: 9, colEnd: 14 },
};
