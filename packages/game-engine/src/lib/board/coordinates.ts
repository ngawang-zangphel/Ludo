import {
  BoardCell,
  BoardCoordinate,
  BoardCellKind,
  BOARD_SIZE,
  HOME_PATH_START,
  HOME_POSITION,
  LOOP_SIZE,
  LUDO_PLAYER_COLORS,
  LudoSeatColor,
  PieceState,
  PlayerColor,
  TRACK_MAX_RELATIVE,
} from '@ludo-game/shared-types';
import {
  CENTER_COORDINATE,
  COLOR_START_INDEX,
  COMMON_PATH,
  HOME_PATHS,
  HOME_TRIANGLES,
  SAFE_INDICES,
  YARD_BOUNDS,
  YARD_SLOTS,
} from './path';

function ludoSeat(color: PlayerColor): LudoSeatColor {
  if (color === PlayerColor.PURPLE) {
    throw new Error('Purple is not a Ludo seat');
  }
  return color;
}

export function getColorStartIndex(color: PlayerColor): number {
  return COLOR_START_INDEX[ludoSeat(color)];
}

export function relativeToGlobal(color: PlayerColor, relativePosition: number): number {
  if (relativePosition < 0 || relativePosition > TRACK_MAX_RELATIVE) {
    throw new Error(`Relative position ${relativePosition} is not on the shared track`);
  }
  return (COLOR_START_INDEX[ludoSeat(color)] + relativePosition) % LOOP_SIZE;
}

export function globalToRelative(color: PlayerColor, globalIndex: number): number {
  return (globalIndex - COLOR_START_INDEX[ludoSeat(color)] + LOOP_SIZE) % LOOP_SIZE;
}

export function isSafeSquare(globalIndex: number): boolean {
  return SAFE_INDICES.has(globalIndex);
}

export function getTrackCoordinate(globalIndex: number): BoardCoordinate {
  const cell = COMMON_PATH[globalIndex];
  if (!cell) {
    throw new Error(`Invalid global track index: ${globalIndex}`);
  }
  return cell;
}

/**
 * Maps a player-relative path position to a board cell.
 *
 * Relative model:
 *   0–50   shared track (51 squares; the 52nd loop square is skipped to enter home)
 *   51–55  private home path
 *   56     home / finished
 */
export function getAbsoluteBoardPosition(
  color: PlayerColor,
  relativePosition: number
): BoardCoordinate {
  if (relativePosition < 0 || relativePosition > HOME_POSITION) {
    throw new Error(`Invalid relative position: ${relativePosition}`);
  }

  if (relativePosition <= TRACK_MAX_RELATIVE) {
    return getTrackCoordinate(relativeToGlobal(color, relativePosition));
  }

  if (relativePosition < HOME_POSITION) {
    const homeIndex = relativePosition - HOME_PATH_START;
    const cell = HOME_PATHS[ludoSeat(color)][homeIndex];
    if (!cell) {
      throw new Error(`Invalid home-path index: ${homeIndex}`);
    }
    return cell;
  }

  return HOME_TRIANGLES[ludoSeat(color)];
}

export function getGlobalPosition(
  color: PlayerColor,
  relativePosition: number
): BoardCoordinate {
  return getAbsoluteBoardPosition(color, relativePosition);
}

export function getYardSlot(color: PlayerColor, slot: number): BoardCoordinate {
  const cell = YARD_SLOTS[ludoSeat(color)][slot];
  if (!cell) {
    throw new Error(`Invalid yard slot ${slot} for ${color}`);
  }
  return cell;
}

export function getPieceCoordinate(
  color: PlayerColor,
  state: PieceState,
  position: number
): BoardCoordinate {
  if (state === PieceState.YARD) {
    return getYardSlot(color, position);
  }
  return getAbsoluteBoardPosition(color, position);
}

/** Full player path from start through home, 57 cells (0–56). */
export function getPlayerPath(color: PlayerColor): BoardCoordinate[] {
  const path: BoardCoordinate[] = [];
  for (let relative = 0; relative <= HOME_POSITION; relative += 1) {
    path.push(getAbsoluteBoardPosition(color, relative));
  }
  return path;
}

export function pieceStateForRelative(relativePosition: number): PieceState {
  if (relativePosition < 0) {
    return PieceState.YARD;
  }
  if (relativePosition <= TRACK_MAX_RELATIVE) {
    return PieceState.BOARD;
  }
  if (relativePosition < HOME_POSITION) {
    return PieceState.HOME_PATH;
  }
  return PieceState.HOME;
}

export function checkHomeEntry(fromRelative: number, toRelative: number): boolean {
  return fromRelative <= TRACK_MAX_RELATIVE && toRelative >= HOME_PATH_START;
}

function yardColorAt(row: number, col: number): PlayerColor | undefined {
  for (const color of LUDO_PLAYER_COLORS) {
    const bounds = YARD_BOUNDS[color];
    if (
      row >= bounds.rowStart &&
      row <= bounds.rowEnd &&
      col >= bounds.colStart &&
      col <= bounds.colEnd
    ) {
      return color;
    }
  }
  return undefined;
}

function findYardSlot(color: PlayerColor, row: number, col: number): number | undefined {
  const index = YARD_SLOTS[ludoSeat(color)].findIndex((slot) => slot.row === row && slot.col === col);
  return index >= 0 ? index : undefined;
}

/**
 * Programmatic 15×15 board map used by the Angular renderer.
 * Game rules never read pixel coordinates; they use relative positions.
 */
export function getBoardLayout(): BoardCell[][] {
  const cells: BoardCell[][] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const line: BoardCell[] = [];
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      line.push({ row, col, kind: 'YARD' });
    }
    cells.push(line);
  }

  for (const color of LUDO_PLAYER_COLORS) {
    const bounds = YARD_BOUNDS[color];
    for (let row = bounds.rowStart; row <= bounds.rowEnd; row += 1) {
      for (let col = bounds.colStart; col <= bounds.colEnd; col += 1) {
        const slot = findYardSlot(color, row, col);
        const cell = cells[row]?.[col];
        if (!cell) {
          continue;
        }
        cell.kind = slot === undefined ? 'YARD' : 'YARD_SLOT';
        cell.color = color;
        if (slot !== undefined) {
          cell.yardSlot = slot;
        }
      }
    }
  }

  COMMON_PATH.forEach((coord, globalIndex) => {
    const cell = cells[coord.row]?.[coord.col];
    if (!cell) {
      return;
    }
    let kind: BoardCellKind = 'TRACK';
    if (START_COLOR_BY_INDEX[globalIndex]) {
      kind = 'START';
      cell.color = START_COLOR_BY_INDEX[globalIndex];
    } else if (SAFE_INDICES.has(globalIndex)) {
      kind = 'SAFE';
    }
    cell.kind = kind;
    cell.globalIndex = globalIndex;
  });

  LUDO_PLAYER_COLORS.forEach((color) => {
    HOME_PATHS[color].forEach((coord, homePathIndex) => {
      const cell = cells[coord.row]?.[coord.col];
      if (!cell) {
        return;
      }
      cell.kind = 'HOME_PATH';
      cell.color = color;
      cell.homePathIndex = homePathIndex;
    });

    const triangle = HOME_TRIANGLES[color];
    const triangleCell = cells[triangle.row]?.[triangle.col];
    if (triangleCell) {
      triangleCell.kind = 'HOME_TRIANGLE';
      triangleCell.color = color;
    }
  });

  const center = cells[CENTER_COORDINATE.row]?.[CENTER_COORDINATE.col];
  if (center) {
    center.kind = 'CENTER';
  }

  // Mark remaining yard interiors that were not overwritten.
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = cells[row]?.[col];
      if (!cell || cell.kind !== 'YARD' || cell.color) {
        continue;
      }
      const color = yardColorAt(row, col);
      if (color) {
        cell.color = color;
      }
    }
  }

  return cells;
}

const START_COLOR_BY_INDEX: Record<number, PlayerColor> = {
  0: PlayerColor.RED,
  13: PlayerColor.GREEN,
  26: PlayerColor.YELLOW,
  39: PlayerColor.BLUE,
};
