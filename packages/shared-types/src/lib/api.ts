import {
  DisconnectRules,
  GameRules,
} from './rules';
import { GameState } from './game-state';
import {
  GameType,
  MatchStatus,
  ParticipantStatus,
  PlayerColor,
  TournamentStatus,
  UserRole,
} from './enums';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  online?: boolean;
}

export interface AuthResponseDto {
  user: UserDto;
}

export interface TournamentRoundDto {
  name: string;
  number: number;
}

export interface TournamentDto {
  id: string;
  name: string;
  status: TournamentStatus;
  gameType: GameType;
  rules: GameRules;
  disconnectRules: DisconnectRules;
  rounds: TournamentRoundDto[];
  playerCount: number;
  tableCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantDto {
  id: string;
  tournamentId: string;
  userId: string;
  name: string;
  email: string;
  seed: number;
  status: ParticipantStatus;
  finalRank?: number;
}

export interface MatchPlayerDto {
  userId: string;
  name: string;
  color: PlayerColor;
}

export interface MatchSummaryDto {
  id: string;
  tournamentId: string;
  tournamentName: string;
  gameType: GameType;
  round: string;
  roundNumber: number;
  matchNumber: number;
  status: MatchStatus;
  players: MatchPlayerDto[];
  currentPlayerId: string | null;
  currentPlayerName: string | null;
  winnerIds: string[];
  winnerNames: string[];
  startedAt: string | null;
  finishedAt: string | null;
  durationSeconds: number | null;
  turnNumber: number;
  updatedAt: string;
}

export interface MatchDetailDto extends MatchSummaryDto {
  gameState: GameState | null;
}

export interface MatchResultDto {
  id: string;
  matchId: string;
  tournamentId: string;
  rankings: Array<{ userId: string; name: string; place: number }>;
  finishedAt: string;
}

export interface BroadcastStateDto {
  matchId: string | null;
  match: MatchDetailDto | null;
}

export interface MatchListPayload {
  matches: MatchSummaryDto[];
  broadcastMatchId: string | null;
}
