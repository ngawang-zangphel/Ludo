import {
  MarriageCard,
  MarriageRank,
  MarriageSuit,
  MARRIAGE_RANKS,
  MARRIAGE_SUITS,
} from '@ludo-game/shared-types';

export function buildMarriageDeck(deckCount: number): MarriageCard[] {
  const decks = Math.max(1, Math.floor(deckCount));
  const cards: MarriageCard[] = [];
  for (let deck = 0; deck < decks; deck += 1) {
    for (const suit of MARRIAGE_SUITS) {
      for (const rank of MARRIAGE_RANKS) {
        cards.push({
          id: `${suit}-${rank}-${deck}`,
          suit,
          rank,
          deck,
        });
      }
    }
  }
  return cards;
}

/** Deterministic mulberry32 shuffle. */
export function shuffleCards(cards: MarriageCard[], seed = Date.now()): MarriageCard[] {
  const next = [...cards];
  let t = seed >>> 0;
  const random = () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = next[i];
    const b = next[j];
    if (a && b) {
      next[i] = b;
      next[j] = a;
    }
  }
  return next;
}

export function rankAbove(rank: MarriageRank): MarriageRank | null {
  const order: MarriageRank[] = [...MARRIAGE_RANKS];
  const index = order.indexOf(rank);
  if (index < 0 || index >= order.length - 1) {
    return null;
  }
  return order[index + 1] ?? null;
}

export function rankBelow(rank: MarriageRank): MarriageRank | null {
  const order: MarriageRank[] = [...MARRIAGE_RANKS];
  const index = order.indexOf(rank);
  if (index <= 0) {
    return null;
  }
  return order[index - 1] ?? null;
}

/**
 * Wilds (maal rank): every card whose rank matches the tiplu (any suit).
 * There are no separate joker cards in the deck.
 */
export function isWildCard(card: MarriageCard, tiplu: MarriageCard | null): boolean {
  return tiplu != null && card.rank === tiplu.rank;
}

/** Rebuild a card from its id (`H-10-2`). */
export function parseMarriageCardId(id: string): MarriageCard | null {
  const match = /^([HDCS])-(A|2|3|4|5|6|7|8|9|10|J|Q|K)-(\d+)$/.exec(id);
  if (!match) {
    return null;
  }
  return {
    id,
    suit: match[1] as MarriageSuit,
    rank: match[2] as MarriageRank,
    deck: Number(match[3]),
  };
}

export function isPoplu(card: MarriageCard, tiplu: MarriageCard | null): boolean {
  if (!tiplu) {
    return false;
  }
  const above = rankAbove(tiplu.rank);
  return above != null && card.suit === tiplu.suit && card.rank === above;
}

export function isJhiplu(card: MarriageCard, tiplu: MarriageCard | null): boolean {
  if (!tiplu) {
    return false;
  }
  const below = rankBelow(tiplu.rank);
  return below != null && card.suit === tiplu.suit && card.rank === below;
}

export function cardLabel(card: MarriageCard): string {
  const suitGlyph: Record<MarriageSuit, string> = {
    H: '♥',
    D: '♦',
    C: '♣',
    S: '♠',
  };
  return `${card.rank}${suitGlyph[card.suit]}`;
}
