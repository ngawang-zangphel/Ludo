import { GameEvent, GameState, PieceMoveAnimation } from './game-state';
import { MatchStatus } from './enums';
import { MatchListPayload, MatchPlayerDto } from './api';

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

export interface MarriageDrawPayload {
  matchId: string;
  source: 'stock' | 'discard';
}

export interface MarriageDiscardPayload {
  matchId: string;
  cardId: string;
}

export interface MarriageOpenPayload {
  matchId: string;
  /** Optional; server can auto-suggest if omitted. */
  melds?: Array<[string, string, string]>;
}

export interface MarriageShowPayload {
  matchId: string;
  /** Optional discard; server picks a winning discard if omitted. */
  discardCardId?: string;
}

export interface MarriageReorderPayload {
  matchId: string;
  /** Cards in the free hand tray (ordered). */
  freeCardIds: string[];
  /** Cards in the temporary sequence-hold tray (ordered). */
  holdCardIds: string[];
  /**
   * Three pure sequences for seeing maal (optional reorder).
   * After hasSeenMaal, membership must stay the same — breaking throws.
   */
  maalSequences: Array<[string, string, string]>;
}

/** Cut maal when the current drawer already has three pure opens. */
export interface MarriageEnsureMaalPayload {
  matchId: string;
}

/** Lay a hand card onto an open meld (after maal/tiplu is visible). */
export interface MarriageExtendMeldPayload {
  matchId: string;
  cardId: string;
  meldIndex: number;
}

/** Join two open sequence melds into one longer run. */
export interface MarriageJoinMeldsPayload {
  matchId: string;
  meldIndexA: number;
  meldIndexB: number;
}

/** Pull a card from an open sequence back into hand. */
export interface MarriageRemoveMeldCardPayload {
  matchId: string;
  meldIndex: number;
  cardId: string;
}

export interface ReconnectMatchPayload {
  matchId: string;
}

export interface AdminMatchPayload {
  matchId: string;
}

export interface AdminSetBroadcastPayload {
  matchId: string | null;
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

export interface PlayerReadyPayload {
  matchId: string;
  playerId: string;
  ready: boolean;
  players: MatchPlayerDto[];
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

export interface PresenceUpdatedPayload {
  onlineUserIds: string[];
}

export interface ClientToServerEvents {
  'join-match': (payload: JoinMatchPayload) => void;
  'leave-match': (payload: LeaveMatchPayload) => void;
  'roll-dice': (payload: RollDicePayload) => void;
  'move-piece': (payload: MovePiecePayload) => void;
  'marriage-draw': (payload: MarriageDrawPayload) => void;
  'marriage-discard': (payload: MarriageDiscardPayload) => void;
  'marriage-open': (payload: MarriageOpenPayload) => void;
  'marriage-show': (payload: MarriageShowPayload) => void;
  'marriage-reorder': (payload: MarriageReorderPayload) => void;
  'marriage-ensure-maal': (payload: MarriageEnsureMaalPayload) => void;
  'marriage-extend-meld': (payload: MarriageExtendMeldPayload) => void;
  'marriage-join-melds': (payload: MarriageJoinMeldsPayload) => void;
  'marriage-remove-meld-card': (payload: MarriageRemoveMeldCardPayload) => void;
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
  'player-ready': (payload: PlayerReadyPayload) => void;
  'match-started': (payload: MatchStatusPayload) => void;
  'match-paused': (payload: MatchStatusPayload) => void;
  'match-resumed': (payload: MatchStatusPayload) => void;
  'match-finished': (payload: MatchFinishedPayload) => void;
  'match-error': (payload: MatchErrorPayload) => void;
  'broadcast-match-changed': (payload: BroadcastMatchChangedPayload) => void;
  'matches-updated': (payload: MatchListPayload) => void;
  'presence-updated': (payload: PresenceUpdatedPayload) => void;
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
