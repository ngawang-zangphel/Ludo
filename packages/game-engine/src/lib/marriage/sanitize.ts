import {
  isMarriageState,
  MarriageCard,
  MarriageGameState,
  MarriagePlayer,
  GameState,
} from '@ludo-game/shared-types';

const HIDDEN: MarriageCard = { id: 'hidden', suit: 'S', rank: 'A', deck: 0 };

function faceDownCards(count: number, prefix: string): MarriageCard[] {
  return Array.from({ length: count }, (_, index) => ({
    ...HIDDEN,
    id: `${prefix}-${index}`,
  }));
}

export interface MarriageSanitizeOptions {
  /** Admins / spectators with privilege see every hand and the stock. */
  revealAll?: boolean;
}

/** Normalize older saved players missing layout fields. */
export function normalizeMarriagePlayer(player: MarriagePlayer): MarriagePlayer {
  return {
    ...player,
    holdCardIds: player.holdCardIds ?? [],
    maalSequences: player.maalSequences ?? [],
    maalProtectIds: player.maalProtectIds ?? [],
    hasSeenMaal: player.hasSeenMaal ?? false,
  };
}

/**
 * Hide other players' hands, stock faces, and maal unless the viewer has seen it.
 * Viewer sees their own layout; revealAll keeps the full table visible.
 */
export function sanitizeMarriageState(
  state: MarriageGameState,
  viewerId: string | null,
  options?: MarriageSanitizeOptions
): MarriageGameState {
  const players = state.players.map(normalizeMarriagePlayer);
  const normalized: MarriageGameState = { ...state, players };

  if (options?.revealAll) {
    return normalized;
  }

  const viewer = viewerId ? players.find((player) => player.id === viewerId) : null;
  const canSeeMaal = !!viewer?.hasSeenMaal || !!viewer?.hasOpened;

  return {
    ...normalized,
    stock: faceDownCards(normalized.stock.length, 'stock'),
    tiplu: canSeeMaal ? normalized.tiplu : null,
    players: players.map((player) => {
      if (viewerId && player.id === viewerId) {
        return player;
      }
      return {
        ...player,
        hand: faceDownCards(player.hand.length, `hand-${player.id}`),
        holdCardIds: [],
        maalSequences: [],
        maalProtectIds: [],
        hasSeenMaal: false,
      };
    }),
  };
}

export function sanitizeGameStateForViewer(
  state: GameState,
  viewerId: string | null,
  options?: MarriageSanitizeOptions
): GameState {
  if (!isMarriageState(state)) {
    return state;
  }
  return sanitizeMarriageState(state, viewerId, options);
}
