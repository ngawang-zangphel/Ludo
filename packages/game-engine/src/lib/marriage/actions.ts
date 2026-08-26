import {
  EngineResult,
  GameEngineError,
  GameEvent,
  MarriageCard,
  MarriageGameState,
  MarriageMeld,
  MatchStatus,
  TurnPhase,
} from '@ludo-game/shared-types';
import { isoNow } from '../queries';
import { findCardInHand, findMarriagePlayer } from './create-match';
import { canPartitionHand, classifyMeld, classifyOpenSequence, findThreePureOpenMelds, validateMaalMelds, validateOpenMelds } from './melds';
import { parseMarriageCardId } from './cards';

function bump(
  state: MarriageGameState,
  patch: Partial<MarriageGameState>,
  events: GameEvent[],
  now?: string
): EngineResult<MarriageGameState> {
  const next: MarriageGameState = {
    ...state,
    ...patch,
    version: state.version + 1,
    updatedAt: isoNow(now),
  };
  return {
    state: next,
    events,
    validPieceIds: [],
  };
}

function requireTurn(state: MarriageGameState, playerId: string): void {
  if (state.status !== MatchStatus.LIVE) {
    throw new GameEngineError('MATCH_NOT_LIVE', `Match ${state.matchId} is not live`);
  }
  if (state.currentPlayerId !== playerId) {
    const player = findMarriagePlayer(state, playerId);
    throw new GameEngineError('NOT_PLAYER_TURN', `It is not ${player.name}'s turn`);
  }
}

/** Open-meld edits are allowed on your turn before or after drawing. */
function requireOpenMeldEditPhase(state: MarriageGameState): void {
  if (
    state.turnPhase !== TurnPhase.WAITING_FOR_DRAW &&
    state.turnPhase !== TurnPhase.WAITING_FOR_DISCARD
  ) {
    throw new GameEngineError('WRONG_PHASE', 'Edit open melds on your turn');
  }
}

function replacePlayer(
  state: MarriageGameState,
  playerId: string,
  update: Partial<MarriageGameState['players'][number]>
): MarriageGameState['players'] {
  return state.players.map((player) =>
    player.id === playerId ? { ...player, ...update } : player
  );
}

function nextPlayerId(state: MarriageGameState): string {
  const index = state.players.findIndex((player) => player.id === state.currentPlayerId);
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const player = state.players[(index + offset) % state.players.length];
    if (player && !player.eliminated && player.finishedPosition === undefined) {
      return player.id;
    }
  }
  return state.currentPlayerId;
}

function reshuffleIfNeeded(stock: MarriageCard[], discard: MarriageCard[]): {
  stock: MarriageCard[];
  discard: MarriageCard[];
} {
  if (stock.length > 0) {
    return { stock, discard };
  }
  if (discard.length <= 1) {
    throw new GameEngineError('ILLEGAL_MOVE', 'No cards left to draw');
  }
  const top = discard[discard.length - 1]!;
  const rest = discard.slice(0, -1);
  return { stock: [...rest].reverse(), discard: [top] };
}

/**
 * Reveal maal only when this player has parked three valid pure sequences/tunnels
 * in `maalSequences`. Hands are not auto-scanned — the player must insert the melds.
 */
function qualifyPlayerForMaal(
  state: MarriageGameState,
  playerId: string,
  events: GameEvent[]
): {
  stock: MarriageCard[];
  discard: MarriageCard[];
  tiplu: MarriageCard | null;
  players: MarriageGameState['players'];
  changed: boolean;
} {
  const players = state.players.map((entry) => ({
    ...entry,
    holdCardIds: entry.holdCardIds ?? [],
    maalSequences: entry.maalSequences ?? [],
    maalProtectIds: entry.maalProtectIds ?? [],
    hasSeenMaal: entry.hasSeenMaal ?? false,
  }));
  const playerIndex = players.findIndex((entry) => entry.id === playerId);
  const player = playerIndex >= 0 ? players[playerIndex] : null;

  if (!player || player.hasOpened || player.eliminated || player.finishedPosition !== undefined) {
    return {
      stock: state.stock,
      discard: state.discard,
      tiplu: state.tiplu,
      players: state.players,
      changed: false,
    };
  }

  if (player.hasSeenMaal && state.tiplu) {
    return {
      stock: state.stock,
      discard: state.discard,
      tiplu: state.tiplu,
      players: state.players,
      changed: false,
    };
  }

  const filled = player.maalSequences.filter((ids) => ids.length > 0);
  const parked = validateMaalMelds(filled, player.hand, null);
  if (!parked) {
    return {
      stock: state.stock,
      discard: state.discard,
      tiplu: state.tiplu,
      players: state.players,
      changed: false,
    };
  }

  const melds = filled;

  let stock = [...state.stock];
  let discard = [...state.discard];
  let tiplu = state.tiplu;
  if (!tiplu) {
    if (stock.length === 0) {
      const reshuffled = reshuffleIfNeeded(stock, discard);
      stock = reshuffled.stock;
      discard = reshuffled.discard;
    }
    const cut = stock.pop();
    if (!cut) {
      return {
        stock,
        discard,
        tiplu: null,
        players: state.players,
        changed: false,
      };
    }
    tiplu = cut;
    events.push({
      type: 'TIPLU_SET',
      playerId,
      payload: { cardId: tiplu.id, rank: tiplu.rank, suit: tiplu.suit, reason: 'open-ready-before-draw' },
    });
  }

  const lockedIds = new Set(melds.flat());
  const holdCardIds = (player.holdCardIds ?? []).filter((id) => !lockedIds.has(id));
  // Fold parked maal melds back into the free hand — the tray is only for revealing maal.
  const freeIds = player.hand
    .map((card) => card.id)
    .filter((id) => !holdCardIds.includes(id));
  const hand = rebuildHandOrder(player.hand, freeIds, holdCardIds, []);

  players[playerIndex] = {
    ...player,
    hand,
    holdCardIds,
    maalSequences: [],
    maalProtectIds: melds.flat(),
    hasSeenMaal: true,
  };
  events.push({
    type: 'MAAL_SEEN',
    playerId,
    payload: { sequences: melds.length },
  });

  return { stock, discard, tiplu, players, changed: true };
}

function rebuildHandOrder(
  hand: MarriageCard[],
  freeIds: string[],
  holdIds: string[],
  maalSequences: string[][]
): MarriageCard[] {
  const byId = new Map(hand.map((card) => [card.id, card]));
  const ordered = [...freeIds, ...holdIds, ...maalSequences.flat()];
  return ordered
    .map((id) => byId.get(id))
    .filter((card): card is MarriageCard => !!card);
}

function flatMaalIds(sequences: string[][]): string[] {
  return sequences.flat();
}

/** Normalize to at most three slots (empty placeholders allowed). */
function padMaalSlots(sequences: string[][]): string[][] {
  const slots = sequences.slice(0, 3).map((ids) => [...ids]);
  while (slots.length < 3) {
    slots.push([]);
  }
  // Drop trailing empties only when everything is empty (cleaner default).
  if (slots.every((ids) => ids.length === 0)) {
    return [];
  }
  return slots;
}

export function drawMarriageCard(
  state: MarriageGameState,
  playerId: string,
  source: 'stock' | 'discard',
  now?: string
): EngineResult<MarriageGameState> {
  requireTurn(state, playerId);
  if (state.turnPhase !== TurnPhase.WAITING_FOR_DRAW) {
    throw new GameEngineError('WRONG_PHASE', 'Draw a card only at the start of your turn');
  }

  const player = findMarriagePlayer(state, playerId);
  let stock = [...state.stock];
  let discard = [...state.discard];
  let drawn: MarriageCard;

  if (source === 'discard') {
    const top = discard.pop();
    if (!top) {
      throw new GameEngineError('ILLEGAL_MOVE', 'Discard pile is empty');
    }
    drawn = top;
  } else {
    const reshuffled = reshuffleIfNeeded(stock, discard);
    stock = reshuffled.stock;
    discard = reshuffled.discard;
    const top = stock.pop();
    if (!top) {
      throw new GameEngineError('ILLEGAL_MOVE', 'Stock is empty');
    }
    drawn = top;
  }

  const hand = [...player.hand, drawn];
  return bump(
    state,
    {
      stock,
      discard,
      players: replacePlayer(state, playerId, { hand }),
      drawnCardId: drawn.id,
      turnPhase: TurnPhase.WAITING_FOR_DISCARD,
    },
    [
      {
        type: 'CARD_DRAWN',
        playerId,
        payload: { source, cardId: drawn.id },
      },
    ],
    now
  );
}

export function openMarriage(
  state: MarriageGameState,
  playerId: string,
  melds: Array<[string, string, string]>,
  now?: string
): EngineResult<MarriageGameState> {
  requireTurn(state, playerId);
  if (state.turnPhase !== TurnPhase.WAITING_FOR_DISCARD) {
    throw new GameEngineError('WRONG_PHASE', 'Open after drawing a card');
  }

  const player = findMarriagePlayer(state, playerId);
  if (player.hasOpened) {
    throw new GameEngineError('ALREADY_OPENED', `${player.name} has already opened`);
  }

  const validated = validateOpenMelds(melds, player.hand, state.tiplu);
  if (!validated) {
    throw new GameEngineError(
      'INVALID_MELD',
      'Opening needs three pure sequences and/or tunnels'
    );
  }

  const used = new Set(validated.flatMap((meld) => meld.cardIds));
  const hand = player.hand.filter((card) => !used.has(card.id));
  const holdCardIds = (player.holdCardIds ?? []).filter((id) => !used.has(id));

  let stock = [...state.stock];
  let tiplu = state.tiplu;
  const events: GameEvent[] = [
    {
      type: 'PLAYER_OPENED',
      playerId,
      payload: { meldCount: validated.length },
    },
  ];

  if (!tiplu) {
    if (stock.length === 0) {
      const reshuffled = reshuffleIfNeeded(stock, state.discard);
      stock = reshuffled.stock;
    }
    const cut = stock.pop();
    if (!cut) {
      throw new GameEngineError('ILLEGAL_MOVE', 'Cannot cut tiplu — stock empty');
    }
    tiplu = cut;
    events.push({
      type: 'TIPLU_SET',
      playerId,
      payload: { cardId: tiplu.id, rank: tiplu.rank, suit: tiplu.suit },
    });
  }

  return bump(
    state,
    {
      stock,
      tiplu,
      players: replacePlayer(state, playerId, {
        hand,
        holdCardIds,
        maalSequences: [],
        maalProtectIds: [],
        hasSeenMaal: true,
        openMelds: validated,
        hasOpened: true,
      }),
    },
    events,
    now
  );
}

export function discardMarriageCard(
  state: MarriageGameState,
  playerId: string,
  cardId: string,
  now?: string
): EngineResult<MarriageGameState> {
  requireTurn(state, playerId);
  if (state.turnPhase !== TurnPhase.WAITING_FOR_DISCARD) {
    throw new GameEngineError('WRONG_PHASE', 'Discard only after drawing');
  }

  const player = findMarriagePlayer(state, playerId);
  findCardInHand(player, cardId);

  const locked = new Set(
    (player.maalProtectIds?.length ? player.maalProtectIds : flatMaalIds(player.maalSequences ?? []))
  );
  if (player.hasSeenMaal && locked.has(cardId)) {
    throw new GameEngineError(
      'ILLEGAL_MOVE',
      'you cannot destroy the sequence once you have seen the maal'
    );
  }

  const hand = player.hand.filter((card) => card.id !== cardId);
  const discarded = player.hand.find((card) => card.id === cardId)!;
  const discard = [...state.discard, discarded];
  const holdCardIds = (player.holdCardIds ?? []).filter((id) => id !== cardId);
  const nextId = nextPlayerId(state);
  const events: GameEvent[] = [
    {
      type: 'CARD_DISCARDED',
      playerId,
      payload: { cardId },
    },
    {
      type: 'TURN_CHANGED',
      playerId: nextId,
    },
  ];

  const afterDiscard: MarriageGameState = {
    ...state,
    discard,
    players: replacePlayer(state, playerId, { hand, holdCardIds }),
    drawnCardId: null,
    currentPlayerId: nextId,
    turnPhase: TurnPhase.WAITING_FOR_DRAW,
    turnNumber: state.turnNumber + 1,
  };
  const maal = qualifyPlayerForMaal(afterDiscard, nextId, events);

  return bump(
    state,
    {
      discard: maal.discard,
      stock: maal.stock,
      tiplu: maal.tiplu,
      players: maal.changed
        ? maal.players
        : replacePlayer(state, playerId, { hand, holdCardIds }),
      drawnCardId: null,
      currentPlayerId: nextId,
      turnPhase: TurnPhase.WAITING_FOR_DRAW,
      turnNumber: state.turnNumber + 1,
    },
    events,
    now
  );
}

/**
 * Go out after drawing: discard one card; remaining hand must form valid melds.
 * Player must already have opened. Dublee wins are not allowed.
 */
export function showMarriage(
  state: MarriageGameState,
  playerId: string,
  discardCardId: string,
  now?: string
): EngineResult<MarriageGameState> {
  requireTurn(state, playerId);
  if (state.turnPhase !== TurnPhase.WAITING_FOR_DISCARD) {
    throw new GameEngineError('WRONG_PHASE', 'Show after drawing a card');
  }

  const player = findMarriagePlayer(state, playerId);
  if (!player.hasOpened) {
    throw new GameEngineError('NOT_OPENED', 'Open with three pure sequences/tunnels before showing');
  }
  if (state.rules.allowDubleeWin) {
    throw new GameEngineError('ILLEGAL_MOVE', 'Dublee wins are disabled');
  }

  findCardInHand(player, discardCardId);
  const remaining = player.hand.filter((card) => card.id !== discardCardId);
  const closing = canPartitionHand(remaining, state.tiplu);
  if (!closing) {
    throw new GameEngineError(
      'INVALID_MELD',
      'Remaining cards must form valid sequences, trials, or tunnels (no dublee win)'
    );
  }

  const discarded = player.hand.find((card) => card.id === discardCardId)!;
  const players = state.players.map((entry) => {
    if (entry.id === playerId) {
      return {
        ...entry,
        hand: [],
        finishedPosition: 1,
      };
    }
    return entry;
  });

  return bump(
    state,
    {
      discard: [...state.discard, discarded],
      players,
      drawnCardId: null,
      rankings: [playerId],
      status: MatchStatus.COMPLETED,
      turnPhase: TurnPhase.MATCH_OVER,
      validPieceIds: [],
    },
    [
      {
        type: 'PLAYER_SHOW',
        playerId,
        payload: { discardCardId, closingMelds: closing.length },
      },
      {
        type: 'PLAYER_FINISHED',
        playerId,
      },
      {
        type: 'MATCH_FINISHED',
        playerId,
      },
    ],
    now
  );
}

export function marriageCanShow(
  state: MarriageGameState,
  playerId: string
): { discardCardId: string; melds: MarriageMeld[] } | null {
  if (state.currentPlayerId !== playerId || state.turnPhase !== TurnPhase.WAITING_FOR_DISCARD) {
    return null;
  }
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player?.hasOpened) {
    return null;
  }
  for (const card of player.hand) {
    const remaining = player.hand.filter((entry) => entry.id !== card.id);
    const melds = canPartitionHand(remaining, state.tiplu);
    if (melds) {
      return { discardCardId: card.id, melds };
    }
  }
  return null;
}

/** Suggest three pure open melds from the current hand, if any. */
export function marriageSuggestOpen(
  state: MarriageGameState,
  playerId: string
): Array<[string, string, string]> | null {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || player.hasOpened || state.turnPhase !== TurnPhase.WAITING_FOR_DISCARD) {
    return null;
  }
  return findThreePureOpenMelds(player.hand, state.tiplu);
}

/**
 * True when the player has parked three valid pure sequences/tunnels in the maal tray.
 * Maal is never revealed from a hand scan alone — melds must be inserted.
 */
export function marriageReadyToSeeMaal(
  state: MarriageGameState,
  playerId: string
): boolean {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || player.hasOpened || player.hasSeenMaal) {
    return false;
  }
  return validateMaalMelds(
    (player.maalSequences ?? []).filter((ids) => ids.length > 0),
    player.hand,
    null
  ) != null;
}

/**
 * Cut/reveal maal when the current drawer has parked three pure opens in the maal tray.
 */
export function ensureMaalVisibleBeforeDraw(
  state: MarriageGameState,
  now?: string
): EngineResult<MarriageGameState> {
  if (state.status !== MatchStatus.LIVE || state.turnPhase !== TurnPhase.WAITING_FOR_DRAW) {
    return { state, events: [], validPieceIds: [] };
  }
  const events: GameEvent[] = [];
  const maal = qualifyPlayerForMaal(state, state.currentPlayerId, events);
  if (!maal.changed) {
    return { state, events: [], validPieceIds: [] };
  }
  return bump(
    state,
    {
      stock: maal.stock,
      discard: maal.discard,
      tiplu: maal.tiplu,
      players: maal.players,
    },
    events,
    now
  );
}

/**
 * After maal (tiplu) is cut, an opened player may lay a hand card onto an open sequence.
 * Allowed on your turn (before or after drawing). Tunnels cannot grow.
 */
export function extendMarriageMeld(
  state: MarriageGameState,
  playerId: string,
  cardId: string,
  meldIndex: number,
  now?: string
): EngineResult<MarriageGameState> {
  requireTurn(state, playerId);
  requireOpenMeldEditPhase(state);
  if (!state.tiplu) {
    throw new GameEngineError('ILLEGAL_MOVE', 'Maal must be cut before editing open melds');
  }

  const player = findMarriagePlayer(state, playerId);
  if (!player.hasOpened) {
    throw new GameEngineError('NOT_OPENED', 'Open before laying off onto melds');
  }
  const meld = player.openMelds[meldIndex];
  if (!meld) {
    throw new GameEngineError('INVALID_MELD', 'Open meld not found');
  }
  if (meld.type === 'TUNNEL' || meld.type === 'TRIAL') {
    throw new GameEngineError('INVALID_MELD', 'Only sequences can be extended');
  }

  const card = findCardInHand(player, cardId);
  const nextIds = [...meld.cardIds, card.id];
  const pool = [...player.hand, ...meldCards(meld.cardIds)];
  const nextMeld = classifyOpenSequence(nextIds, pool, state.tiplu);
  if (!nextMeld || nextMeld.type !== 'SEQUENCE') {
    throw new GameEngineError('INVALID_MELD', 'Card does not extend that sequence');
  }

  const hand = player.hand.filter((entry) => entry.id !== cardId);
  const openMelds = player.openMelds.map((entry, index) =>
    index === meldIndex ? nextMeld : entry
  );

  return bump(
    state,
    {
      players: replacePlayer(state, playerId, { hand, openMelds }),
    },
    [
      {
        type: 'MELD_EXTENDED',
        playerId,
        payload: { cardId, meldIndex },
      },
    ],
    now
  );
}

/**
 * Join two open sequences into one longer run once maal is visible.
 */
export function joinMarriageMelds(
  state: MarriageGameState,
  playerId: string,
  meldIndexA: number,
  meldIndexB: number,
  now?: string
): EngineResult<MarriageGameState> {
  requireTurn(state, playerId);
  requireOpenMeldEditPhase(state);
  if (!state.tiplu) {
    throw new GameEngineError('ILLEGAL_MOVE', 'Maal must be cut before joining sequences');
  }
  if (meldIndexA === meldIndexB) {
    throw new GameEngineError('INVALID_MELD', 'Pick two different melds');
  }

  const player = findMarriagePlayer(state, playerId);
  if (!player.hasOpened) {
    throw new GameEngineError('NOT_OPENED', 'Open before joining melds');
  }
  const a = player.openMelds[meldIndexA];
  const b = player.openMelds[meldIndexB];
  if (!a || !b) {
    throw new GameEngineError('INVALID_MELD', 'Open meld not found');
  }
  if (a.type !== 'SEQUENCE' || b.type !== 'SEQUENCE') {
    throw new GameEngineError('INVALID_MELD', 'Only sequences can be joined');
  }
  if (player.openMelds.length <= 3) {
    throw new GameEngineError(
      'INVALID_MELD',
      'you cannot destroy the sequence once you have seen the maal'
    );
  }

  const nextIds = [...a.cardIds, ...b.cardIds];
  const pool = [...player.hand, ...meldCards(a.cardIds), ...meldCards(b.cardIds)];
  const joined = classifyOpenSequence(nextIds, pool, state.tiplu);
  if (!joined || joined.type !== 'SEQUENCE') {
    throw new GameEngineError('INVALID_MELD', 'Those sequences cannot be joined');
  }

  const openMelds = player.openMelds
    .filter((_, index) => index !== meldIndexA && index !== meldIndexB)
    .concat(joined);

  return bump(
    state,
    {
      players: replacePlayer(state, playerId, { openMelds }),
    },
    [
      {
        type: 'MELDS_JOINED',
        playerId,
        payload: { meldIndexA, meldIndexB },
      },
    ],
    now
  );
}

/**
 * Pull a card from an open meld back into hand.
 * If the remainder is no longer a valid meld (or would be under 3 cards),
 * the whole meld is dissolved back into hand.
 */
export function removeMarriageMeldCard(
  state: MarriageGameState,
  playerId: string,
  meldIndex: number,
  cardId: string,
  now?: string
): EngineResult<MarriageGameState> {
  requireTurn(state, playerId);
  requireOpenMeldEditPhase(state);
  if (!state.tiplu) {
    throw new GameEngineError('ILLEGAL_MOVE', 'Maal must be cut before editing open melds');
  }

  const player = findMarriagePlayer(state, playerId);
  if (!player.hasOpened) {
    throw new GameEngineError('NOT_OPENED', 'Open before editing melds');
  }
  const meld = player.openMelds[meldIndex];
  if (!meld) {
    throw new GameEngineError('INVALID_MELD', 'Open meld not found');
  }
  if (!meld.cardIds.includes(cardId)) {
    throw new GameEngineError('INVALID_CARD', 'Card is not in that meld');
  }

  const removedCards = meldCards(meld.cardIds);
  const nextIds = meld.cardIds.filter((id) => id !== cardId);
  const pool = [...player.hand, ...removedCards];

  let hand = [...player.hand];
  let openMelds = [...player.openMelds];

  const keepAsSequence =
    meld.type === 'SEQUENCE' &&
    nextIds.length >= 3 &&
    (() => {
      const next = classifyOpenSequence(nextIds, pool, state.tiplu);
      return next && next.type === 'SEQUENCE' ? next : null;
    })();

  if (keepAsSequence) {
    const pulled = removedCards.find((card) => card.id === cardId);
    if (!pulled) {
      throw new GameEngineError('INVALID_CARD', `Unknown card ${cardId}`);
    }
    hand = [...hand, pulled];
    openMelds = openMelds.map((entry, index) => (index === meldIndex ? keepAsSequence : entry));
  } else {
    if (player.openMelds.length <= 3) {
      throw new GameEngineError(
        'INVALID_MELD',
        'you cannot destroy the sequence once you have seen the maal'
      );
    }
    // Dissolve the whole meld back to hand.
    hand = [...hand, ...removedCards];
    openMelds = openMelds.filter((_, index) => index !== meldIndex);
  }

  return bump(
    state,
    {
      players: replacePlayer(state, playerId, { hand, openMelds }),
    },
    [
      {
        type: 'MELD_CARD_REMOVED',
        playerId,
        payload: { cardId, meldIndex, dissolved: !keepAsSequence },
      },
    ],
    now
  );
}

/**
 * After opening, lay an additional meld from hand (sequence / trial / tunnel).
 * Sequences may be longer than three; trials and tunnels are exactly three.
 */
export function addMarriageMeld(
  state: MarriageGameState,
  playerId: string,
  cardIds: string[],
  now?: string
): EngineResult<MarriageGameState> {
  requireTurn(state, playerId);
  requireOpenMeldEditPhase(state);
  if (!state.tiplu) {
    throw new GameEngineError('ILLEGAL_MOVE', 'Maal must be cut before laying new melds');
  }

  const player = findMarriagePlayer(state, playerId);
  if (!player.hasOpened) {
    throw new GameEngineError('NOT_OPENED', 'Open before laying additional melds');
  }
  if (cardIds.length < 3) {
    throw new GameEngineError('INVALID_MELD', 'A meld needs at least three cards');
  }
  if (new Set(cardIds).size !== cardIds.length) {
    throw new GameEngineError('INVALID_CARD', 'Duplicate cards in meld');
  }
  for (const id of cardIds) {
    findCardInHand(player, id);
  }

  let nextMeld: MarriageMeld | null = null;
  if (cardIds.length === 3) {
    const triplet: [string, string, string] = [cardIds[0]!, cardIds[1]!, cardIds[2]!];
    nextMeld = classifyMeld(triplet, player.hand, state.tiplu, false);
  } else {
    nextMeld = classifyOpenSequence(cardIds, player.hand, state.tiplu);
    if (nextMeld && nextMeld.type !== 'SEQUENCE') {
      nextMeld = null;
    }
  }
  if (!nextMeld) {
    throw new GameEngineError('INVALID_MELD', 'Cards do not form a valid meld');
  }

  const used = new Set(cardIds);
  const hand = player.hand.filter((card) => !used.has(card.id));
  const holdCardIds = (player.holdCardIds ?? []).filter((id) => !used.has(id));
  const maalSequences = (player.maalSequences ?? []).map((group) =>
    group.filter((id) => !used.has(id))
  );
  const openMelds = [...player.openMelds, nextMeld];

  return bump(
    state,
    {
      players: replacePlayer(state, playerId, {
        hand,
        holdCardIds,
        maalSequences,
        openMelds,
      }),
    },
    [
      {
        type: 'MELD_ADDED',
        playerId,
        payload: { meldType: nextMeld.type, cardIds: cardIds.join(',') },
      },
    ],
    now
  );
}

function meldCards(cardIds: string[]): MarriageCard[] {
  return cardIds
    .map((id) => parseMarriageCardId(id))
    .filter((card): card is MarriageCard => !!card);
}

/**
 * Organize the player's hand into free tray, sequence hold, and maal sequences.
 * After hasSeenMaal, protected cards may be rearranged but not discarded.
 */
export function reorderMarriageHand(
  state: MarriageGameState,
  playerId: string,
  layout: {
    freeCardIds: string[];
    holdCardIds: string[];
    maalSequences: string[][];
  },
  now?: string
): EngineResult<MarriageGameState> {
  if (state.status !== MatchStatus.LIVE) {
    throw new GameEngineError('MATCH_NOT_LIVE', `Match ${state.matchId} is not live`);
  }
  const player = findMarriagePlayer(state, playerId);
  if (player.eliminated || player.finishedPosition !== undefined) {
    throw new GameEngineError('PLAYER_NOT_ACTIVE', `${player.name} is not active`);
  }

  const freeCardIds = layout.freeCardIds ?? [];
  const holdCardIds = layout.holdCardIds ?? [];
  const maalSequences = layout.maalSequences ?? [];
  const combined = [...freeCardIds, ...holdCardIds, ...maalSequences.flat()];

  if (combined.length !== player.hand.length || new Set(combined).size !== combined.length) {
    throw new GameEngineError('INVALID_CARD', 'Hand layout must include each card once');
  }

  const byId = new Map(player.hand.map((card) => [card.id, card]));
  for (const id of combined) {
    if (!byId.has(id)) {
      throw new GameEngineError('INVALID_CARD', `Card ${id} is not in ${player.name}'s hand`);
    }
  }

  if (maalSequences.length > 3) {
    throw new GameEngineError('INVALID_MELD', 'Maal section has at most three sequences');
  }

  // Allow empty placeholder slots and work-in-progress groups (1–2 cards).
  // Completed groups (3+) must be valid pure sequences/tunnels.
  const used = new Set<string>();
  for (const ids of maalSequences) {
    for (const id of ids) {
      if (used.has(id)) {
        throw new GameEngineError('INVALID_CARD', 'Duplicate card in maal section');
      }
      used.add(id);
    }
    if (ids.length === 0 || ids.length < 3) {
      continue;
    }
    if (ids.length === 3) {
      const triplet: [string, string, string] = [ids[0]!, ids[1]!, ids[2]!];
      const meld = classifyMeld(triplet, player.hand, null, true);
      if (!meld || !meld.pure || (meld.type !== 'SEQUENCE' && meld.type !== 'TUNNEL')) {
        throw new GameEngineError(
          'INVALID_MELD',
          'Maal groups of three must be a pure sequence or tunnel'
        );
      }
      continue;
    }
    const meld = classifyOpenSequence(ids, player.hand, null);
    if (!meld || !meld.pure || meld.type !== 'SEQUENCE') {
      throw new GameEngineError(
        'INVALID_MELD',
        'Longer maal groups must be a pure sequence'
      );
    }
  }

  const filled = maalSequences.filter((ids) => ids.length > 0);
  const ready = validateMaalMelds(filled, player.hand, null);

  const hand = rebuildHandOrder(player.hand, freeCardIds, holdCardIds, maalSequences);
  const protect =
    player.hasSeenMaal && (player.maalProtectIds?.length ?? 0) > 0
      ? player.maalProtectIds
      : ready
        ? filled.flat()
        : (player.maalProtectIds ?? []);

  const laidOut: MarriageGameState = {
    ...state,
    players: replacePlayer(state, playerId, {
      hand,
      holdCardIds,
      // Keep slot positions (including empty) so Sequence 1/2/3 stay stable in the UI.
      maalSequences: padMaalSlots(maalSequences),
      maalProtectIds: protect,
    }),
  };

  const events: GameEvent[] = [
    {
      type: 'HAND_REORDERED',
      playerId,
    },
  ];

  // Parking three pure sequences/tunnels should reveal maal (including for player 2+
  // when tiplu was already cut for someone else).
  if (!player.hasSeenMaal && !player.hasOpened && ready) {
    const maal = qualifyPlayerForMaal(laidOut, playerId, events);
    if (maal.changed) {
      return bump(
        state,
        {
          stock: maal.stock,
          discard: maal.discard,
          tiplu: maal.tiplu,
          players: maal.players,
        },
        events,
        now
      );
    }
  }

  return bump(
    state,
    {
      players: laidOut.players,
    },
    events,
    now
  );
}

