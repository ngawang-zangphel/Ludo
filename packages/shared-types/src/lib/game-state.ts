import { MatchStatus, PieceState, PlayerColor, TurnPhase } from './enums';
import { LudoRules } from './rules';

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
}

export interface GameState {
  matchId: string;
  status: MatchStatus;
  currentPlayerId: string;
  turnPhase: TurnPhase;
  dice: DiceState;
  players: LudoPlayer[];
  turnNumber: number;
  consecutiveSixes: number;
  validPieceIds: string[];
  rankings: string[];
  rules: LudoRules;
  /** Optimistic concurrency token. Incremented on every authoritative change. */
  version: number;
  createdAt: string;
  updatedAt: string;
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

export interface EngineResult {
  state: GameState;
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
  | 'INVALID_PLAYER_SETUP';
