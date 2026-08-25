import {
  canDealMarriage,
  CreateMarriageMatchInput,
  GameEngineError,
  GameType,
  MarriageCard,
  MarriageGameState,
  MarriagePlayer,
  MarriageSeatColor,
  MARRIAGE_SEAT_COLORS,
  MatchStatus,
  resolveMarriageRules,
  TurnPhase,
} from '@ludo-game/shared-types';
import { isoNow } from '../queries';
import { buildMarriageDeck, shuffleCards } from './cards';
import { findThreePureOpenMelds, sortHand } from './melds';

export function createMarriageMatchState(input: CreateMarriageMatchInput): MarriageGameState {
  const rules = resolveMarriageRules(input.rules);
  const playerCount = input.players.length;

  if (playerCount < 2 || playerCount > MARRIAGE_SEAT_COLORS.length) {
    throw new GameEngineError(
      'INVALID_PLAYER_SETUP',
      `Marriage requires 2 to ${MARRIAGE_SEAT_COLORS.length} players`
    );
  }

  if (!canDealMarriage(playerCount, rules.deckCount, rules.handSize)) {
    throw new GameEngineError(
      'INVALID_PLAYER_SETUP',
      `${rules.deckCount} decks cannot deal ${rules.handSize} cards to ${playerCount} players`
    );
  }

  const colors = new Set<MarriageSeatColor>();
  const ids = new Set<string>();
  for (const player of input.players) {
    if (!MARRIAGE_SEAT_COLORS.includes(player.color)) {
      throw new GameEngineError('INVALID_PLAYER_SETUP', `Invalid seat color ${player.color}`);
    }
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
    (a, b) => MARRIAGE_SEAT_COLORS.indexOf(a.color) - MARRIAGE_SEAT_COLORS.indexOf(b.color)
  );

  const seed = input.seed ?? Date.now();
  const deck = shuffleCards(buildMarriageDeck(rules.deckCount), seed);
  const stock = [...deck];
  const players: MarriagePlayer[] = sortedPlayers.map((player) => {
    const hand = sortHand(stock.splice(0, rules.handSize));
    return {
      id: player.id,
      userId: player.userId,
      name: player.name,
      color: player.color,
      hand,
      holdCardIds: [],
      maalSequences: [],
      maalProtectIds: [],
      hasSeenMaal: false,
      openMelds: [],
      hasOpened: false,
      connected: input.initialConnected ?? true,
    };
  });

  const first = players[0];
  if (!first) {
    throw new GameEngineError('INVALID_PLAYER_SETUP', 'No players after setup');
  }

  const discardTop = stock.pop();
  if (!discardTop) {
    throw new GameEngineError('INVALID_PLAYER_SETUP', 'Deck exhausted during deal');
  }

  // If the first player already has three pure opens, cut maal and lock sequences.
  let tiplu: MarriageCard | null = null;
  const firstOpens = findThreePureOpenMelds(first.hand, null);
  if (firstOpens) {
    tiplu = stock.pop() ?? null;
    if (tiplu) {
      const locked = new Set(firstOpens.flat());
      first.maalSequences = firstOpens;
      first.maalProtectIds = firstOpens.flat();
      first.hasSeenMaal = true;
      first.holdCardIds = [];
      first.hand = [
        ...first.hand.filter((card) => !locked.has(card.id)),
        ...firstOpens.flat().map((id) => first.hand.find((card) => card.id === id)!),
      ];
    }
  }

  const now = isoNow(input.now);

  return {
    matchId: input.matchId,
    gameType: GameType.MARRIAGE,
    status: MatchStatus.LIVE,
    currentPlayerId: first.id,
    turnPhase: TurnPhase.WAITING_FOR_DRAW,
    dice: { value: null, rolled: false },
    players,
    stock,
    discard: [discardTop],
    tiplu,
    drawnCardId: null,
    turnNumber: 1,
    validPieceIds: [],
    rankings: [],
    rules,
    rollDeadlineAt: null,
    version: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function createLocalMarriageDemoMatch(
  now?: string,
  rules?: CreateMarriageMatchInput['rules'],
  seed?: number
): MarriageGameState {
  return createMarriageMatchState({
    matchId: 'local-marriage-demo',
    now,
    rules,
    seed,
    players: [
      { id: 'player-red', userId: 'user-red', name: 'Karma', color: 'RED' },
      { id: 'player-green', userId: 'user-green', name: 'Pema', color: 'GREEN' },
      { id: 'player-yellow', userId: 'user-yellow', name: 'Sonam', color: 'YELLOW' },
      { id: 'player-blue', userId: 'user-blue', name: 'Tashi', color: 'BLUE' },
    ],
  });
}

export function findMarriagePlayer(state: MarriageGameState, playerId: string): MarriagePlayer {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new GameEngineError('UNKNOWN_PLAYER', `Player ${playerId} is not in this match`);
  }
  return player;
}

export function findCardInHand(player: MarriagePlayer, cardId: string): MarriageCard {
  const card = player.hand.find((entry) => entry.id === cardId);
  if (!card) {
    throw new GameEngineError('INVALID_CARD', `Card ${cardId} is not in ${player.name}'s hand`);
  }
  return card;
}
