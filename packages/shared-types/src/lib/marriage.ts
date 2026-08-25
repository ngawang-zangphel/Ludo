/** French-suited ranks used in Marriage (3-deck rummy variant). */
export type MarriageRank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export type MarriageSuit = 'H' | 'D' | 'C' | 'S';

export const MARRIAGE_RANKS: readonly MarriageRank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
] as const;

export const MARRIAGE_SUITS: readonly MarriageSuit[] = ['H', 'D', 'C', 'S'] as const;

export const MARRIAGE_RANK_VALUE: Record<MarriageRank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
};

export interface MarriageCard {
  id: string;
  suit: MarriageSuit;
  rank: MarriageRank;
  /** Which physical deck copy (0-based). */
  deck: number;
}

export type MarriageMeldType = 'SEQUENCE' | 'TRIAL' | 'TUNNEL';

export interface MarriageMeld {
  type: MarriageMeldType;
  /**
   * Opening melds are three cards; sequences may grow after maal (tiplu) is set
   * when players lay off or join runs. No separate joker cards — wilds are tiplu rank.
   */
  cardIds: string[];
  /** Pure melds use no wild cards. Required for opening. */
  pure: boolean;
}

/**
 * Seat tints for Marriage tables (independent of Ludo board colors).
 * Sized for multi-deck tables with many players.
 */
export const MARRIAGE_SEAT_COLORS = [
  'RED',
  'GREEN',
  'YELLOW',
  'BLUE',
  'PURPLE',
  'ORANGE',
  'TEAL',
  'PINK',
  'BROWN',
  'CYAN',
  'LIME',
  'INDIGO',
] as const;
export type MarriageSeatColor = (typeof MARRIAGE_SEAT_COLORS)[number];

export const MARRIAGE_SEAT_SWATCH: Record<MarriageSeatColor, string> = {
  RED: '#ff4d6d',
  GREEN: '#22c55e',
  YELLOW: '#f5c842',
  BLUE: '#38bdf8',
  PURPLE: '#a78bfa',
  ORANGE: '#fb923c',
  TEAL: '#2dd4bf',
  PINK: '#f472b6',
  BROWN: '#a16207',
  CYAN: '#22d3ee',
  LIME: '#a3e635',
  INDIGO: '#818cf8',
};

export const MARRIAGE_HAND_SIZE = 21;
export const MARRIAGE_OPEN_MELD_COUNT = 3;
export const MARRIAGE_TOTAL_MELDS = 7;

/** Practical range for house tables (classic is 3). */
export const MARRIAGE_MIN_DECKS = 2;
export const MARRIAGE_MAX_DECKS = 8;

export type MarriageDeckCount = number;

export interface MarriageRules {
  deckCount: number;
  handSize: number;
  /**
   * Dublee (identical-card pairs) is never a winning path in this build.
   * Kept explicit so house rules stay documented in state.
   */
  allowDubleeWin: false;
}

export const DEFAULT_MARRIAGE_RULES: MarriageRules = {
  deckCount: 3,
  handSize: MARRIAGE_HAND_SIZE,
  allowDubleeWin: false,
};

export function clampMarriageDeckCount(value: number | null | undefined): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) {
    return DEFAULT_MARRIAGE_RULES.deckCount;
  }
  return Math.min(MARRIAGE_MAX_DECKS, Math.max(MARRIAGE_MIN_DECKS, n));
}

export function resolveMarriageRules(partial?: Partial<MarriageRules> | null): MarriageRules {
  const deckCount = clampMarriageDeckCount(partial?.deckCount);
  const handSize = partial?.handSize ?? DEFAULT_MARRIAGE_RULES.handSize;
  return {
    deckCount,
    handSize,
    allowDubleeWin: false,
  };
}

export function marriageCardCapacity(deckCount: number): number {
  return clampMarriageDeckCount(deckCount) * 52;
}

/** True when deal leaves at least one stock card after dealing every hand. */
export function canDealMarriage(
  playerCount: number,
  deckCount: number,
  handSize = MARRIAGE_HAND_SIZE
): boolean {
  const decks = clampMarriageDeckCount(deckCount);
  const maxSeats = Math.min(MARRIAGE_SEAT_COLORS.length, maxMarriagePlayers(decks, handSize));
  return playerCount >= 2 && playerCount <= maxSeats && playerCount * handSize < marriageCardCapacity(decks);
}

export function maxMarriagePlayers(deckCount: number, handSize = MARRIAGE_HAND_SIZE): number {
  const byCards = Math.floor((marriageCardCapacity(deckCount) - 1) / handSize);
  return Math.min(MARRIAGE_SEAT_COLORS.length, Math.max(2, byCards));
}

export const MARRIAGE_DECK_OPTIONS: readonly number[] = Array.from(
  { length: MARRIAGE_MAX_DECKS - MARRIAGE_MIN_DECKS + 1 },
  (_, index) => MARRIAGE_MIN_DECKS + index
);
