import {
  canDealMarriage,
  MarriageCard,
  TurnPhase,
} from '@ludo-game/shared-types';
import { buildMarriageDeck, isWildCard, shuffleCards } from './cards';
import { createMarriageMatchState } from './create-match';
import {
  discardMarriageCard,
  drawMarriageCard,
  marriageSuggestOpen,
  openMarriage,
  reorderMarriageHand,
} from './actions';
import { canPartitionHand, classifyMeld } from './melds';

describe('marriage cards', () => {
  it('builds 2 and 3 decks', () => {
    expect(buildMarriageDeck(2)).toHaveLength(104);
    expect(buildMarriageDeck(3)).toHaveLength(156);
  });

  it('shuffles deterministically for a seed', () => {
    const a = shuffleCards(buildMarriageDeck(2), 42).map((card) => card.id);
    const b = shuffleCards(buildMarriageDeck(2), 42).map((card) => card.id);
    expect(a).toEqual(b);
  });

  it('treats tiplu rank as wild', () => {
    const tiplu: MarriageCard = { id: 'C-7-0', suit: 'C', rank: '7', deck: 0 };
    expect(isWildCard({ id: 'H-7-1', suit: 'H', rank: '7', deck: 1 }, tiplu)).toBe(true);
    expect(isWildCard({ id: 'C-8-0', suit: 'C', rank: '8', deck: 0 }, tiplu)).toBe(false);
  });
});

describe('marriage deal limits', () => {
  it('scales seats with deck count', () => {
    expect(canDealMarriage(5, 3)).toBe(true);
    expect(canDealMarriage(5, 2)).toBe(false);
    expect(canDealMarriage(4, 2)).toBe(true);
    expect(canDealMarriage(8, 4)).toBe(true);
    expect(buildMarriageDeck(5)).toHaveLength(260);
  });
});

describe('marriage melds', () => {
  it('detects pure sequence and tunnel', () => {
    const hand: MarriageCard[] = [
      { id: 'H-7-0', suit: 'H', rank: '7', deck: 0 },
      { id: 'H-8-0', suit: 'H', rank: '8', deck: 0 },
      { id: 'H-9-0', suit: 'H', rank: '9', deck: 0 },
      { id: 'S-5-0', suit: 'S', rank: '5', deck: 0 },
      { id: 'S-5-1', suit: 'S', rank: '5', deck: 1 },
      { id: 'S-5-2', suit: 'S', rank: '5', deck: 2 },
    ];
    expect(classifyMeld(['H-7-0', 'H-8-0', 'H-9-0'], hand, null, true)?.type).toBe('SEQUENCE');
    expect(classifyMeld(['S-5-0', 'S-5-1', 'S-5-2'], hand, null, true)?.type).toBe('TUNNEL');
  });

  it('rejects K-A-2 wrap', () => {
    const hand: MarriageCard[] = [
      { id: 'D-K-0', suit: 'D', rank: 'K', deck: 0 },
      { id: 'D-A-0', suit: 'D', rank: 'A', deck: 0 },
      { id: 'D-2-0', suit: 'D', rank: '2', deck: 0 },
    ];
    expect(classifyMeld(['D-K-0', 'D-A-0', 'D-2-0'], hand, null, true)).toBeNull();
  });

  it('allows Q-K-A', () => {
    const hand: MarriageCard[] = [
      { id: 'D-Q-0', suit: 'D', rank: 'Q', deck: 0 },
      { id: 'D-K-0', suit: 'D', rank: 'K', deck: 0 },
      { id: 'D-A-0', suit: 'D', rank: 'A', deck: 0 },
    ];
    expect(classifyMeld(['D-Q-0', 'D-K-0', 'D-A-0'], hand, null, true)?.type).toBe('SEQUENCE');
  });
});

describe('marriage match flow', () => {
  it('creates a live match and draws/discards', () => {
    const state = createMarriageMatchState({
      matchId: 't1',
      seed: 7,
      rules: { deckCount: 3 },
      players: [
        { id: 'p1', userId: 'u1', name: 'A', color: 'RED' },
        { id: 'p2', userId: 'u2', name: 'B', color: 'GREEN' },
      ],
    });
    expect(state.players[0]?.hand).toHaveLength(21);
    expect(state.discard).toHaveLength(1);

    const drawn = drawMarriageCard(state, 'p1', 'stock');
    expect(drawn.state.turnPhase).toBe('WAITING_FOR_DISCARD');
    expect(drawn.state.players[0]?.hand).toHaveLength(22);

    const cardId = drawn.state.drawnCardId!;
    const discarded = discardMarriageCard(drawn.state, 'p1', cardId);
    expect(discarded.state.currentPlayerId).toBe('p2');
    expect(discarded.state.turnPhase).toBe('WAITING_FOR_DRAW');
  });

  it('rejects 5 players with 2 decks', () => {
    expect(() =>
      createMarriageMatchState({
        matchId: 'bad',
        rules: { deckCount: 2 },
        players: [
          { id: 'p1', userId: 'u1', name: 'A', color: 'RED' },
          { id: 'p2', userId: 'u2', name: 'B', color: 'GREEN' },
          { id: 'p3', userId: 'u3', name: 'C', color: 'YELLOW' },
          { id: 'p4', userId: 'u4', name: 'D', color: 'BLUE' },
          { id: 'p5', userId: 'u5', name: 'E', color: 'PURPLE' },
        ],
      })
    ).toThrow(/cannot deal/);
  });

  it('reorders a player hand without changing membership', () => {
    const state = createMarriageMatchState({
      matchId: 'reorder',
      seed: 3,
      rules: { deckCount: 3 },
      players: [
        { id: 'p1', userId: 'u1', name: 'A', color: 'RED' },
        { id: 'p2', userId: 'u2', name: 'B', color: 'GREEN' },
      ],
    });
    const hand = state.players[0]!.hand;
    const freeCardIds = [...hand].reverse().map((card) => card.id);
    const result = reorderMarriageHand(state, 'p1', {
      freeCardIds,
      holdCardIds: [],
      maalSequences: [],
    });
    expect(result.state.players[0]!.hand.map((card) => card.id)).toEqual(freeCardIds);
    expect(new Set(result.state.players[0]!.hand.map((card) => card.id))).toEqual(
      new Set(hand.map((card) => card.id))
    );
  });

  it('allows rearranging maal sequences after seeing maal but blocks discarding them', () => {
    const state = createMarriageMatchState({
      matchId: 'lock',
      seed: 4,
      rules: { deckCount: 3 },
      players: [
        { id: 'p1', userId: 'u1', name: 'A', color: 'RED' },
        { id: 'p2', userId: 'u2', name: 'B', color: 'GREEN' },
      ],
    });
    const forced: MarriageCard[] = [];
    const suits = ['H', 'D', 'C'] as const;
    for (const suit of suits) {
      forced.push(
        { id: `${suit}-2-0`, suit, rank: '2', deck: 0 },
        { id: `${suit}-3-0`, suit, rank: '3', deck: 0 },
        { id: `${suit}-4-0`, suit, rank: '4', deck: 0 }
      );
    }
    while (forced.length < 21) {
      const n = forced.length;
      forced.push({
        id: `S-${n}-y`,
        suit: 'S',
        rank: (['5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '5', '6'] as const)[n - 9] ?? '5',
        deck: 0,
      });
    }
    const melds: Array<[string, string, string]> = [
      ['H-2-0', 'H-3-0', 'H-4-0'],
      ['D-2-0', 'D-3-0', 'D-4-0'],
      ['C-2-0', 'C-3-0', 'C-4-0'],
    ];
    const locked = new Set(melds.flat());
    const withSeen = {
      ...state,
      tiplu: { id: 'S-A-0', suit: 'S' as const, rank: 'A' as const, deck: 0 },
      turnPhase: TurnPhase.WAITING_FOR_DISCARD,
      currentPlayerId: 'p1',
      players: state.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hand: forced,
              hasSeenMaal: true,
              maalSequences: melds,
              maalProtectIds: melds.flat(),
              holdCardIds: [],
            }
          : player
      ),
    };
    const free = forced.filter((card) => !locked.has(card.id)).map((card) => card.id);
    const rearranged = reorderMarriageHand(withSeen, 'p1', {
      freeCardIds: [...free, ...melds.flat()],
      holdCardIds: [],
      maalSequences: [],
    });
    expect(rearranged.state.players[0]!.maalProtectIds).toEqual(melds.flat());
    expect(rearranged.state.players[0]!.maalSequences).toEqual([]);
    expect(() => discardMarriageCard(rearranged.state, 'p1', 'H-2-0')).toThrow(
      /cannot break the sequence once you see the maal/i
    );
  });

  it('reveals maal before draw when the next player already has three pure opens', () => {
    const state = createMarriageMatchState({
      matchId: 'maal-ready',
      seed: 2,
      rules: { deckCount: 3 },
      players: [
        { id: 'p1', userId: 'u1', name: 'A', color: 'RED' },
        { id: 'p2', userId: 'u2', name: 'B', color: 'GREEN' },
      ],
    });

    const forced: MarriageCard[] = [];
    const suits = ['H', 'D', 'C'] as const;
    for (const suit of suits) {
      forced.push(
        { id: `${suit}-2-0`, suit, rank: '2', deck: 0 },
        { id: `${suit}-3-0`, suit, rank: '3', deck: 0 },
        { id: `${suit}-4-0`, suit, rank: '4', deck: 0 }
      );
    }
    while (forced.length < 21) {
      const n = forced.length;
      forced.push({
        id: `S-${n}-x`,
        suit: 'S',
        rank: (['5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '5', '6'] as const)[n - 9] ?? '5',
        deck: 0,
      });
    }

    const withHand = {
      ...state,
      tiplu: null,
      players: state.players.map((player, index) =>
        index === 1 ? { ...player, hand: forced } : player
      ),
    };

    const afterDraw = drawMarriageCard(withHand, 'p1', 'stock');
    const discardId = afterDraw.state.drawnCardId!;
    const afterDiscard = discardMarriageCard(afterDraw.state, 'p1', discardId);
    expect(afterDiscard.state.currentPlayerId).toBe('p2');
    expect(afterDiscard.state.turnPhase).toBe('WAITING_FOR_DRAW');
    expect(afterDiscard.state.tiplu).not.toBeNull();
  });

  it('opens when three pure melds exist and sets tiplu', () => {
    const state = createMarriageMatchState({
      matchId: 'open',
      seed: 1,
      rules: { deckCount: 3 },
      players: [
        { id: 'p1', userId: 'u1', name: 'A', color: 'RED' },
        { id: 'p2', userId: 'u2', name: 'B', color: 'GREEN' },
      ],
    });

    // Force a known openable hand.
    const forced: MarriageCard[] = [];
    const suits = ['H', 'D', 'C'] as const;
    for (const suit of suits) {
      forced.push(
        { id: `${suit}-2-0`, suit, rank: '2', deck: 0 },
        { id: `${suit}-3-0`, suit, rank: '3', deck: 0 },
        { id: `${suit}-4-0`, suit, rank: '4', deck: 0 }
      );
    }
    while (forced.length < 21) {
      const n = forced.length;
      forced.push({
        id: `S-${n}-x`,
        suit: 'S',
        rank: (['5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '5', '6'] as const)[n - 9] ?? '5',
        deck: 0,
      });
    }

    const withHand = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, hand: forced } : player
      ),
    };

    const afterDraw = drawMarriageCard(withHand, 'p1', 'stock');
    const suggestion = marriageSuggestOpen(afterDraw.state, 'p1');
    expect(suggestion).not.toBeNull();
    const opened = openMarriage(afterDraw.state, 'p1', suggestion!);
    expect(opened.state.players[0]?.hasOpened).toBe(true);
    expect(opened.state.tiplu).not.toBeNull();
    expect(opened.state.players[0]?.openMelds).toHaveLength(3);
  });
});

describe('marriage partition', () => {
  it('partitions a simple 6-card hand', () => {
    const hand: MarriageCard[] = [
      { id: 'H-2-0', suit: 'H', rank: '2', deck: 0 },
      { id: 'H-3-0', suit: 'H', rank: '3', deck: 0 },
      { id: 'H-4-0', suit: 'H', rank: '4', deck: 0 },
      { id: 'D-9-0', suit: 'D', rank: '9', deck: 0 },
      { id: 'C-9-0', suit: 'C', rank: '9', deck: 0 },
      { id: 'S-9-0', suit: 'S', rank: '9', deck: 0 },
    ];
    const melds = canPartitionHand(hand, null);
    expect(melds).toHaveLength(2);
  });
});
