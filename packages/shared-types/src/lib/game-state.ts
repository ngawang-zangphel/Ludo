import { GameType, MatchStatus, PieceState, PlayerColor, TurnPhase } from './enums';
import { LudoRules, MarriageCard, MarriageMeld, MarriageRules, MarriageSeatColor, SnakesRules } from './rules';

export interface DiceState {
  value: number | null;
  rolled: boolean;
}

export interface LudoPiece {
  id: string;
  state: PieceState;
  /**
   * Yard: slot index 0–3.
   * Board: relative path 0–50.
   * Home path: 51–55.
   * Home: 56.
   */
  position: number;
}

export interface LudoPlayer {
  id: string;
  userId: string;
  name: string;
  color: PlayerColor;
  pieces: LudoPiece[];
  connected: boolean;
  finishedPosition?: number;
  eliminated?: boolean;
}

export interface SnakesPlayer {
  id: string;
  userId: string;
  name: string;
  color: PlayerColor;
  tokenId: string;
  /** 0 = start (off the numbered board). 1–100 = square. */
  position: number;
  connected: boolean;
  finishedPosition?: number;
  eliminated?: boolean;
}

interface GameStateBase {
  matchId: string;
  status: MatchStatus;
  currentPlayerId: string;
  turnPhase: TurnPhase;
  dice: DiceState;
  turnNumber: number;
  validPieceIds: string[];
  rankings: string[];
  /**
   * When the current player must auto-roll. Set while WAITING_FOR_ROLL so every
   * client can show the same idle/countdown timer. Null otherwise.
   */
  rollDeadlineAt: string | null;
  /** Optimistic concurrency token. Incremented on every authoritative change. */
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface LudoGameState extends GameStateBase {
  gameType: GameType.LUDO;
  players: LudoPlayer[];
  consecutiveSixes: number;
  rules: LudoRules;
}

export interface SnakesGameState extends GameStateBase {
  gameType: GameType.SNAKES;
  players: SnakesPlayer[];
  rules: SnakesRules;
}

export interface MarriagePlayer {
  id: string;
  userId: string;
  name: string;
  color: MarriageSeatColor;
  hand: MarriageCard[];
  /**
   * Temporary sequence-hold tray (ordered card ids). Subset of `hand`.
   * Persisted so rejoin restores the layout.
   */
  holdCardIds: string[];
  /**
   * Three pure sequences used to qualify for seeing maal (display grouping; editable).
   */
  maalSequences: Array<[string, string, string]>;
  /**
   * Card ids that cannot be discarded after seeing maal (the nine cards that qualified).
   * Survives rearranging trays until the player opens.
   */
  maalProtectIds: string[];
  /** True after this player has qualified and may see the cut maal. */
  hasSeenMaal: boolean;
  /** Three pure melds laid when the player opens (table melds). */
  openMelds: MarriageMeld[];
  hasOpened: boolean;
  connected: boolean;
  finishedPosition?: number;
  eliminated?: boolean;
}

export interface MarriageGameState extends GameStateBase {
  gameType: GameType.MARRIAGE;
  players: MarriagePlayer[];
  stock: MarriageCard[];
  discard: MarriageCard[];
  /** Cut maal (tiplu); null until a player qualifies. Hidden per-viewer until hasSeenMaal. */
  tiplu: MarriageCard | null;
  /** Card drawn this turn (must discard before turn ends). */
  drawnCardId: string | null;
  rules: MarriageRules;
}

export type GameState = LudoGameState | SnakesGameState | MarriageGameState;

export function isSnakesState(state: GameState): state is SnakesGameState {
  return state.gameType === GameType.SNAKES;
}

export function isMarriageState(state: GameState): state is MarriageGameState {
  return state.gameType === GameType.MARRIAGE;
}

export function isLudoState(state: GameState): state is LudoGameState {
  return state.gameType === GameType.LUDO;
}

export function resolveGameType(
  value: GameType | { gameType?: GameType } | null | undefined
): GameType {
  if (
    value === GameType.SNAKES ||
    value === GameType.LUDO ||
    value === GameType.MARRIAGE
  ) {
    return value;
  }
  if (value && typeof value === 'object') {
    if (value.gameType === GameType.SNAKES) {
      return GameType.SNAKES;
    }
    if (value.gameType === GameType.MARRIAGE) {
      return GameType.MARRIAGE;
    }
  }
  return GameType.LUDO;
}

export interface CreateMatchPlayer {
  id: string;
  userId: string;
  name: string;
  color: PlayerColor;
}

export interface CreateMatchInput {
  matchId: string;
  players: CreateMatchPlayer[];
  rules?: Partial<LudoRules>;
  now?: string;
  initialConnected?: boolean;
}

export interface CreateSnakesMatchInput {
  matchId: string;
  players: CreateMatchPlayer[];
  rules?: Partial<SnakesRules>;
  now?: string;
  initialConnected?: boolean;
}

export interface CreateMarriageMatchPlayer {
  id: string;
  userId: string;
  name: string;
  color: MarriageSeatColor;
}

export interface CreateMarriageMatchInput {
  matchId: string;
  players: CreateMarriageMatchPlayer[];
  rules?: Partial<MarriageRules>;
  now?: string;
  initialConnected?: boolean;
  /** Optional RNG seed for deterministic deals (tests). */
  seed?: number;
}

export interface ValidMove {
  pieceId: string;
  fromState: PieceState;
  fromPosition: number;
  toState: PieceState;
  toPosition: number;
  captures: CapturedPieceRef[];
  entersBoard: boolean;
  entersHomePath: boolean;
  reachesHome: boolean;
}

export interface CapturedPieceRef {
  playerId: string;
  pieceId: string;
}

export interface PieceMoveAnimation {
  pieceId: string;
  from: { row: number; col: number };
  steps: Array<{ row: number; col: number }>;
}

export interface GameEvent {
  type: string;
  playerId?: string;
  pieceId?: string;
  payload?: Record<string, string | number | boolean | null>;
}

export interface EngineResult<T extends GameState = GameState> {
  state: T;
  events: GameEvent[];
  validPieceIds: string[];
  animation?: PieceMoveAnimation;
}

export class GameEngineError extends Error {
  readonly code: GameEngineErrorCode;

  constructor(code: GameEngineErrorCode, message: string) {
    super(message);
    this.name = 'GameEngineError';
    this.code = code;
  }
}

export type GameEngineErrorCode =
  | 'MATCH_NOT_LIVE'
  | 'UNKNOWN_PLAYER'
  | 'NOT_PLAYER_TURN'
  | 'DICE_ALREADY_ROLLED'
  | 'DICE_NOT_ROLLED'
  | 'INVALID_PIECE'
  | 'ILLEGAL_MOVE'
  | 'INVALID_PLAYER_SETUP'
  | 'INVALID_BOARD_LAYOUT'
  | 'PLAYER_NOT_ACTIVE'
  | 'INVALID_CARD'
  | 'INVALID_MELD'
  | 'ALREADY_OPENED'
  | 'NOT_OPENED'
  | 'WRONG_PHASE';
