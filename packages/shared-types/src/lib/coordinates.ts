import { PlayerColor } from './enums';

/**
 * 0-indexed cell on the 15×15 board. Row 0 is the top of the board.
 */
export interface BoardCoordinate {
  row: number;
  col: number;
}

export const BOARD_SIZE = 15;
export const SNAKES_BOARD_SIZE = 10;
export const SNAKES_FINISH_SQUARE = 100;
export const LOOP_SIZE = 52;
/** Relative positions 0–50 are on the shared 52-square loop. */
export const TRACK_MAX_RELATIVE = 50;
export const HOME_PATH_START = 51;
export const HOME_PATH_LENGTH = 5;
export const HOME_POSITION = 56;
export const PIECES_PER_PLAYER = 4;

export type BoardCellKind =
  | 'YARD'
  | 'YARD_SLOT'
  | 'TRACK'
  | 'START'
  | 'SAFE'
  | 'HOME_PATH'
  | 'HOME_TRIANGLE'
  | 'CENTER';

export interface BoardCell {
  row: number;
  col: number;
  kind: BoardCellKind;
  color?: PlayerColor;
  /** Global loop index 0–51 when the cell is on the shared track. */
  globalIndex?: number;
  /** 0–4 along a player's private home path. */
  homePathIndex?: number;
  /** 0–3 yard slot used by a specific piece id suffix. */
  yardSlot?: number;
}
