import {
  CreateMatchInput,
  DEFAULT_LUDO_RULES,
  GameEngineError,
  GameState,
  LudoPlayer,
  LudoRules,
  MatchStatus,
  PIECES_PER_PLAYER,
  PieceState,
  PLAYER_COLOR_ORDER,
  PlayerColor,
  TurnPhase,
} from '@ludo-game/shared-types';
import { isoNow } from './queries';

export function createMatchState(input: CreateMatchInput): GameState {
  if (input.players.length < 2 || input.players.length > 4) {
    throw new GameEngineError(
      'INVALID_PLAYER_SETUP',
      'A match requires 2 to 4 players'
    );
  }

  const colors = new Set<PlayerColor>();
  const ids = new Set<string>();
  for (const player of input.players) {
    if (colors.has(player.color)) {
      throw new GameEngineError('INVALID_PLAYER_SETUP', `Duplicate color ${player.color}`);
    }
    if (ids.has(player.id)) {
      throw new GameEngineError('INVALID_PLAYER_SETUP', `Duplicate player id ${player.id}`);
    }
    colors.add(player.color);
    ids.add(player.id);
  }

  const sortedPlayers = [...input.players].sort(
    (a, b) => PLAYER_COLOR_ORDER.indexOf(a.color) - PLAYER_COLOR_ORDER.indexOf(b.color)
  );

  const now = isoNow(input.now);
  const rules: LudoRules = { ...DEFAULT_LUDO_RULES, ...input.rules };
  const players: LudoPlayer[] = sortedPlayers.map((player) => ({
    id: player.id,
    userId: player.userId,
    name: player.name,
    color: player.color,
    connected: input.initialConnected ?? true,
    pieces: Array.from({ length: PIECES_PER_PLAYER }, (_, index) => ({
      id: `${player.color.toLowerCase()}-${index}`,
      state: PieceState.YARD,
      position: index,
    })),
  }));

  const first = players[0];
  if (!first) {
    throw new GameEngineError('INVALID_PLAYER_SETUP', 'No players after setup');
  }

  return {
    matchId: input.matchId,
    status: MatchStatus.LIVE,
    currentPlayerId: first.id,
    turnPhase: TurnPhase.WAITING_FOR_ROLL,
    dice: { value: null, rolled: false },
    players,
    turnNumber: 1,
    consecutiveSixes: 0,
    validPieceIds: [],
    rankings: [],
    rules,
    version: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function createLocalDemoMatch(now?: string): GameState {
  return createMatchState({
    matchId: 'local-demo',
    now,
    players: [
      { id: 'player-red', userId: 'user-red', name: 'Karma', color: PlayerColor.RED },
      { id: 'player-green', userId: 'user-green', name: 'Pema', color: PlayerColor.GREEN },
      { id: 'player-yellow', userId: 'user-yellow', name: 'Sonam', color: PlayerColor.YELLOW },
      { id: 'player-blue', userId: 'user-blue', name: 'Tashi', color: PlayerColor.BLUE },
    ],
  });
}
