import { PlayerColor } from '@ludo-game/shared-types';

export const PLAYER_SWATCH: Record<PlayerColor, string> = {
  [PlayerColor.RED]: '#ff4b4b',
  [PlayerColor.GREEN]: '#3dcc6a',
  [PlayerColor.YELLOW]: '#ffd23a',
  [PlayerColor.BLUE]: '#4fc3f7',
  [PlayerColor.PURPLE]: '#c084fc',
};

export const PLAYER_TRACK: Record<PlayerColor, string> = {
  [PlayerColor.RED]: '#ff5f5f',
  [PlayerColor.GREEN]: '#4caf50',
  [PlayerColor.YELLOW]: '#ffc93d',
  [PlayerColor.BLUE]: '#4fc3f7',
  [PlayerColor.PURPLE]: '#9b5de5',
};

export const PIECE_PAINT: Record<
  PlayerColor,
  { light: string; mid: string; deep: string; shade: string }
> = {
  [PlayerColor.RED]: {
    light: '#ff8a8a',
    mid: '#ff4b4b',
    deep: '#e53935',
    shade: '#b71c1c',
  },
  [PlayerColor.GREEN]: {
    light: '#81e59a',
    mid: '#3dcc6a',
    deep: '#2e9e4f',
    shade: '#1b5e20',
  },
  [PlayerColor.YELLOW]: {
    light: '#ffe57a',
    mid: '#ffd23a',
    deep: '#f5b400',
    shade: '#c48a00',
  },
  [PlayerColor.BLUE]: {
    light: '#90e0ff',
    mid: '#4fc3f7',
    deep: '#29b6f6',
    shade: '#0288d1',
  },
  [PlayerColor.PURPLE]: {
    light: '#e9d5ff',
    mid: '#c084fc',
    deep: '#a855f7',
    shade: '#6b21a8',
  },
};
