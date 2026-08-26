export enum PlayerColor {
  RED = 'RED',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  BLUE = 'BLUE',
}

export enum GameType {
  LUDO = 'LUDO',
  SNAKES = 'SNAKES',
  MARRIAGE = 'MARRIAGE',
}

export const GAME_TYPE_LABEL: Record<GameType, string> = {
  [GameType.LUDO]: 'Ludo',
  [GameType.SNAKES]: 'Snakes & Ladders',
  [GameType.MARRIAGE]: 'Marriage',
};

export enum MatchStatus {
  WAITING = 'WAITING',
  READY = 'READY',
  LIVE = 'LIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TurnPhase {
  WAITING_FOR_ROLL = 'WAITING_FOR_ROLL',
  WAITING_FOR_MOVE = 'WAITING_FOR_MOVE',
  WAITING_FOR_DRAW = 'WAITING_FOR_DRAW',
  WAITING_FOR_DISCARD = 'WAITING_FOR_DISCARD',
  MATCH_OVER = 'MATCH_OVER',
}

export enum PieceState {
  YARD = 'YARD',
  BOARD = 'BOARD',
  HOME_PATH = 'HOME_PATH',
  HOME = 'HOME',
}

export enum UserRole {
  PLAYER = 'PLAYER',
  ADMIN = 'ADMIN',
}

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  REGISTRATION = 'REGISTRATION',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ParticipantStatus {
  REGISTERED = 'REGISTERED',
  ACTIVE = 'ACTIVE',
  ELIMINATED = 'ELIMINATED',
  WINNER = 'WINNER',
}

export enum GameEventType {
  MATCH_STARTED = 'MATCH_STARTED',
  DICE_ROLLED = 'DICE_ROLLED',
  NO_VALID_MOVES = 'NO_VALID_MOVES',
  PIECE_MOVED = 'PIECE_MOVED',
  PIECE_CAPTURED = 'PIECE_CAPTURED',
  PIECE_ENTERED_BOARD = 'PIECE_ENTERED_BOARD',
  PIECE_ENTERED_HOME_PATH = 'PIECE_ENTERED_HOME_PATH',
  PIECE_REACHED_HOME = 'PIECE_REACHED_HOME',
  PLAYER_FINISHED = 'PLAYER_FINISHED',
  PLAYER_REMOVED = 'PLAYER_REMOVED',
  TURN_CHANGED = 'TURN_CHANGED',
  EXTRA_TURN = 'EXTRA_TURN',
  CONSECUTIVE_SIXES_FORFEIT = 'CONSECUTIVE_SIXES_FORFEIT',
  MATCH_PAUSED = 'MATCH_PAUSED',
  MATCH_RESUMED = 'MATCH_RESUMED',
  MATCH_FINISHED = 'MATCH_FINISHED',
  LANDED_ON_SNAKE = 'LANDED_ON_SNAKE',
  LANDED_ON_LADDER = 'LANDED_ON_LADDER',
}

/** Clockwise order around the board, starting from RED (bottom-left). */
export const PLAYER_COLOR_ORDER: readonly PlayerColor[] = [
  PlayerColor.RED,
  PlayerColor.GREEN,
  PlayerColor.YELLOW,
  PlayerColor.BLUE,
] as const;

/** Opposite corners: GREEN (NW) ↔ BLUE (SE), RED (SW) ↔ YELLOW (NE). */
export const PLAYER_COLOR_OPPOSITE: Record<PlayerColor, PlayerColor> = {
  [PlayerColor.RED]: PlayerColor.YELLOW,
  [PlayerColor.GREEN]: PlayerColor.BLUE,
  [PlayerColor.YELLOW]: PlayerColor.RED,
  [PlayerColor.BLUE]: PlayerColor.GREEN,
};

/** Default seats. Two players sit on a diagonal; 3–4 fill clockwise from RED. */
export function defaultSeatColors(count: number): PlayerColor[] {
  if (count === 2) {
    return [PlayerColor.GREEN, PlayerColor.BLUE];
  }
  return PLAYER_COLOR_ORDER.slice(0, Math.min(4, Math.max(2, count)));
}
