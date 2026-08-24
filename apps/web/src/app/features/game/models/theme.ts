import { PlayerColor } from '@ludo-game/shared-types';

export const PLAYER_SWATCH: Record<PlayerColor, string> = {
  [PlayerColor.RED]: '#ff4d6d',
  [PlayerColor.GREEN]: '#22c55e',
  [PlayerColor.YELLOW]: '#f5c842',
  [PlayerColor.BLUE]: '#38bdf8',
};

export const PLAYER_TRACK: Record<PlayerColor, string> = {
  [PlayerColor.RED]: '#7a1d32',
  [PlayerColor.GREEN]: '#166534',
  [PlayerColor.YELLOW]: '#927115',
  [PlayerColor.BLUE]: '#1d4e7a',
};

export const PIECE_PAINT: Record<
  PlayerColor,
  { light: string; mid: string; deep: string; shade: string }
> = {
  [PlayerColor.RED]: {
    light: '#ff8fa3',
    mid: '#ff4d6d',
    deep: '#c81e3a',
    shade: '#7a1024',
  },
  [PlayerColor.GREEN]: {
    light: '#86efac',
    mid: '#22c55e',
    deep: '#15803d',
    shade: '#14532d',
  },
  [PlayerColor.YELLOW]: {
    light: '#fde68a',
    mid: '#f5c842',
    deep: '#ca8a04',
    shade: '#854d0e',
  },
  [PlayerColor.BLUE]: {
    light: '#7dd3fc',
    mid: '#38bdf8',
    deep: '#0284c7',
    shade: '#0c4a6e',
  },
};
