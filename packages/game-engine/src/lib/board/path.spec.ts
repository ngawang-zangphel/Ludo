import { BOARD_SIZE, LOOP_SIZE, LUDO_PLAYER_COLORS, PlayerColor } from '@ludo-game/shared-types';
import {
  COLOR_START_INDEX,
  COMMON_PATH,
  HOME_PATHS,
  HOME_TRIANGLES,
  SAFE_INDICES,
  YARD_SLOTS,
} from './path';
import {
  getAbsoluteBoardPosition,
  getBoardLayout,
  getPlayerPath,
  isSafeSquare,
  relativeToGlobal,
} from './coordinates';

describe('board path', () => {
  it('has exactly 52 unique common-path cells', () => {
    expect(COMMON_PATH).toHaveLength(LOOP_SIZE);
    const keys = new Set(COMMON_PATH.map((cell) => `${cell.row},${cell.col}`));
    expect(keys.size).toBe(52);
  });

  it('keeps every common-path cell inside the 15×15 board', () => {
    for (const cell of COMMON_PATH) {
      expect(cell.row).toBeGreaterThanOrEqual(0);
      expect(cell.row).toBeLessThan(BOARD_SIZE);
      expect(cell.col).toBeGreaterThanOrEqual(0);
      expect(cell.col).toBeLessThan(BOARD_SIZE);
    }
  });

  it('maps each color start 13 squares apart', () => {
    expect(COLOR_START_INDEX[PlayerColor.RED]).toBe(0);
    expect(COLOR_START_INDEX[PlayerColor.GREEN]).toBe(13);
    expect(COLOR_START_INDEX[PlayerColor.YELLOW]).toBe(26);
    expect(COLOR_START_INDEX[PlayerColor.BLUE]).toBe(39);
  });

  it('treats all start and star squares as safe', () => {
    expect(isSafeSquare(0)).toBe(true);
    expect(isSafeSquare(8)).toBe(true);
    expect(isSafeSquare(13)).toBe(true);
    expect(isSafeSquare(21)).toBe(true);
    expect(isSafeSquare(26)).toBe(true);
    expect(isSafeSquare(34)).toBe(true);
    expect(isSafeSquare(39)).toBe(true);
    expect(isSafeSquare(47)).toBe(true);
    expect(isSafeSquare(1)).toBe(false);
    expect(SAFE_INDICES.size).toBe(8);
  });

  it('gives each color a 5-cell private home path plus a home triangle', () => {
    for (const color of LUDO_PLAYER_COLORS) {
      expect(HOME_PATHS[color]).toHaveLength(5);
      expect(HOME_TRIANGLES[color]).toEqual(getAbsoluteBoardPosition(color, 56));
      expect(YARD_SLOTS[color]).toHaveLength(4);
    }
  });

  it('maps relative 0 of every color onto that color start cell', () => {
    expect(getAbsoluteBoardPosition(PlayerColor.RED, 0)).toEqual(COMMON_PATH[0]);
    expect(getAbsoluteBoardPosition(PlayerColor.GREEN, 0)).toEqual(COMMON_PATH[13]);
    expect(getAbsoluteBoardPosition(PlayerColor.YELLOW, 0)).toEqual(COMMON_PATH[26]);
    expect(getAbsoluteBoardPosition(PlayerColor.BLUE, 0)).toEqual(COMMON_PATH[39]);
  });

  it('wraps global indices correctly for every color', () => {
    expect(relativeToGlobal(PlayerColor.GREEN, 40)).toBe((13 + 40) % 52);
    expect(relativeToGlobal(PlayerColor.BLUE, 20)).toBe((39 + 20) % 52);
  });

  it('builds a 57-step player path for all four colors', () => {
    for (const color of LUDO_PLAYER_COLORS) {
      const path = getPlayerPath(color);
      expect(path).toHaveLength(57);
      expect(path[0]).toEqual(getAbsoluteBoardPosition(color, 0));
      expect(path[51]).toEqual(HOME_PATHS[color][0]);
      expect(path[56]).toEqual(HOME_TRIANGLES[color]);
    }
  });

  it('does not place two colors on the same home-path cell', () => {
    const keys = new Set<string>();
    for (const color of LUDO_PLAYER_COLORS) {
      for (const cell of HOME_PATHS[color]) {
        const key = `${cell.row},${cell.col}`;
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      }
    }
  });

  it('builds a complete 15×15 layout containing track, yards, and home paths', () => {
    const layout = getBoardLayout();
    expect(layout).toHaveLength(15);
    expect(layout[0]).toHaveLength(15);

    const kinds = layout.flat().map((cell) => cell.kind);
    expect(kinds).toContain('START');
    expect(kinds).toContain('SAFE');
    expect(kinds).toContain('HOME_PATH');
    expect(kinds).toContain('YARD_SLOT');
    expect(kinds).toContain('CENTER');
  });
});
