import { GameEvent, GameState, PieceMoveAnimation } from './game-state';
import { MatchStatus } from './enums';
import { MatchListPayload } from './api';

export interface JoinMatchPayload {
  matchId: string;
}

export interface LeaveMatchPayload {
  matchId: string;
}

export interface RollDicePayload {
  matchId: string;
}

export interface MovePiecePayload {
  matchId: string;
  pieceId: string;
}

export interface ReconnectMatchPayload {
  matchId: string;
}

export interface AdminMatchPayload {
  matchId: string;
}

export interface AdminSetBroadcastPayload {
  matchId: string;
}

export interface MatchStatePayload {
  matchId: string;
  state: GameState;
}

export interface DiceRolledPayload {
  matchId: string;
  playerId: string;
  value: number;
  validPieceIds: string[];
  state: GameState;
}

export interface PieceMovedPayload {
  matchId: string;
  playerId: string;
  pieceId: string;
  state: GameState;
  events: GameEvent[];
  animation?: PieceMoveAnimation;
}

export interface PieceCapturedPayload {
  matchId: string;
  playerId: string;
  pieceId: string;
  capturedPieceId: string;
  capturedPlayerId: string;
}

export interface TurnChangedPayload {
  matchId: string;
  currentPlayerId: string;
  turnNumber: number;
}

export interface PlayerConnectionPayload {
  matchId: string;
  playerId: string;
}

export interface MatchStatusPayload {
  matchId: string;
  status: MatchStatus;
}

export interface MatchFinishedPayload {
  matchId: string;
  rankings: string[];
  state: GameState;
}

export interface MatchErrorPayload {
  matchId?: string;
  code: string;
  message: string;
}

export interface BroadcastMatchChangedPayload {
  matchId: string | null;
}

export interface ClientToServerEvents {
  'join-match': (payload: JoinMatchPayload) => void;
  'leave-match': (payload: LeaveMatchPayload) => void;
  'roll-dice': (payload: RollDicePayload) => void;
  'move-piece': (payload: MovePiecePayload) => void;
  'reconnect-match': (payload: ReconnectMatchPayload) => void;
  'admin-subscribe': () => void;
  'join-broadcast': () => void;
  'leave-broadcast': () => void;
  'admin-start-match': (payload: AdminMatchPayload) => void;
  'admin-pause-match': (payload: AdminMatchPayload) => void;
  'admin-resume-match': (payload: AdminMatchPayload) => void;
  'admin-restart-match': (payload: AdminMatchPayload) => void;
  'admin-cancel-match': (payload: AdminMatchPayload) => void;
  'admin-set-broadcast-match': (payload: AdminSetBroadcastPayload) => void;
}

export interface ServerToClientEvents {
  'match-state': (payload: MatchStatePayload) => void;
  'match-state-updated': (payload: MatchStatePayload) => void;
  'dice-rolled': (payload: DiceRolledPayload) => void;
  'piece-moved': (payload: PieceMovedPayload) => void;
  'piece-captured': (payload: PieceCapturedPayload) => void;
  'turn-changed': (payload: TurnChangedPayload) => void;
  'player-connected': (payload: PlayerConnectionPayload) => void;
  'player-disconnected': (payload: PlayerConnectionPayload) => void;
  'match-started': (payload: MatchStatusPayload) => void;
  'match-paused': (payload: MatchStatusPayload) => void;
  'match-resumed': (payload: MatchStatusPayload) => void;
  'match-finished': (payload: MatchFinishedPayload) => void;
  'match-error': (payload: MatchErrorPayload) => void;
  'broadcast-match-changed': (payload: BroadcastMatchChangedPayload) => void;
  'matches-updated': (payload: MatchListPayload) => void;
}

export type TypedClientSocket = {
  emit: <Event extends keyof ClientToServerEvents>(
    event: Event,
    ...args: Parameters<ClientToServerEvents[Event]>
  ) => void;
  on: <Event extends keyof ServerToClientEvents>(
    event: Event,
    listener: ServerToClientEvents[Event]
  ) => void;
};
