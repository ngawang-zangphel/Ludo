import {
  MarriageCard,
  MarriageMeld,
  MarriageMeldType,
  MARRIAGE_RANK_VALUE,
} from '@ludo-game/shared-types';
import { isWildCard, parseMarriageCardId } from './cards';

type CardTriplet = [MarriageCard, MarriageCard, MarriageCard];

function byId(cards: MarriageCard[]): Map<string, MarriageCard> {
  return new Map(cards.map((card) => [card.id, card]));
}

function resolveCards(cardIds: string[], pool: MarriageCard[]): MarriageCard[] | null {
  const map = byId(pool);
  if (new Set(cardIds).size !== cardIds.length) {
    return null;
  }
  const cards: MarriageCard[] = [];
  for (const id of cardIds) {
    const fromPool = map.get(id) ?? parseMarriageCardId(id);
    if (!fromPool) {
      return null;
    }
    cards.push(fromPool);
  }
  return cards;
}

function resolveTriplet(
  cardIds: [string, string, string],
  hand: MarriageCard[]
): CardTriplet | null {
  const cards = resolveCards(cardIds, hand);
  if (!cards || cards.length !== 3) {
    return null;
  }
  return [cards[0]!, cards[1]!, cards[2]!];
}

function isTunnel(cards: MarriageCard[]): boolean {
  if (cards.length !== 3) {
    return false;
  }
  const [a, b, c] = cards as CardTriplet;
  return a.rank === b.rank && b.rank === c.rank && a.suit === b.suit && b.suit === c.suit;
}

/** Same rank, three different suits (not a tunnel). */
function isTrial(cards: MarriageCard[]): boolean {
  if (cards.length !== 3) {
    return false;
  }
  const [a, b, c] = cards as CardTriplet;
  if (!(a.rank === b.rank && b.rank === c.rank)) {
    return false;
  }
  if (a.suit === b.suit && b.suit === c.suit) {
    return false;
  }
  const suitCounts = new Map<string, number>();
  for (const card of cards) {
    suitCounts.set(card.suit, (suitCounts.get(card.suit) ?? 0) + 1);
  }
  for (const count of suitCounts.values()) {
    if (count >= 2) {
      return false;
    }
  }
  return true;
}

function sortedNaturalValues(cards: MarriageCard[]): number[] {
  return cards
    .map((card) => MARRIAGE_RANK_VALUE[card.rank])
    .sort((left, right) => left - right);
}

/** Pure same-suit run of 3+. Ace high (…Q-K-A) or low (A-2-3…), not wrapping (K-A-2). */
export function isPureSequenceCards(cards: MarriageCard[]): boolean {
  if (cards.length < 3) {
    return false;
  }
  const suit = cards[0]?.suit;
  if (!suit || cards.some((card) => card.suit !== suit)) {
    return false;
  }
  const values = sortedNaturalValues(cards);
  const unique = new Set(values);
  if (unique.size !== values.length) {
    return false;
  }

  // Ace-high run: Ace with consecutive high cards ending at K.
  if (values[0] === 1 && values[values.length - 1] === 13) {
    const highs = values.slice(1);
    for (let i = 1; i < highs.length; i += 1) {
      if (highs[i]! !== highs[i - 1]! + 1) {
        return false;
      }
    }
    return highs[0]! === 14 - highs.length;
  }

  for (let i = 1; i < values.length; i += 1) {
    if (values[i]! !== values[i - 1]! + 1) {
      return false;
    }
  }
  return true;
}

function isPureSequence(cards: CardTriplet): boolean {
  return isPureSequenceCards(cards);
}

/**
 * Impure sequence: same intended suit run with wilds filling gaps.
 * Natural cards must share one suit; wilds substitute missing ranks.
 */
function isImpureSequenceCards(cards: MarriageCard[], tiplu: MarriageCard | null): boolean {
  if (!tiplu || cards.length < 3) {
    return false;
  }
  const naturals = cards.filter((card) => !isWildCard(card, tiplu));
  const wildCount = cards.length - naturals.length;
  if (wildCount === 0) {
    return isPureSequenceCards(cards);
  }
  if (naturals.length === 0) {
    return true;
  }
  const suit = naturals[0]?.suit;
  if (!suit || naturals.some((card) => card.suit !== suit)) {
    return false;
  }
  if (naturals.length === 1) {
    return true;
  }

  const values = sortedNaturalValues(naturals);
  const unique = new Set(values);
  if (unique.size !== values.length) {
    return false;
  }

  const low = values[0]!;
  const high = values[values.length - 1]!;
  const span = high - low + 1;
  if (span <= cards.length && span - naturals.length <= wildCount) {
    return true;
  }

  // Ace-high with wilds filling toward K.
  if (values[0] === 1) {
    const highs = values.slice(1);
    if (highs.length === 0) {
      return true;
    }
    const highLow = highs[0]!;
    const aceHighSpan = 14 - highLow + 1;
    const used = highs.length + 1;
    if (aceHighSpan <= cards.length && aceHighSpan - used <= wildCount) {
      return true;
    }
  }

  return false;
}

function isImpureSequence(cards: CardTriplet, tiplu: MarriageCard | null): boolean {
  return isImpureSequenceCards(cards, tiplu);
}

function isImpureTrial(cards: CardTriplet, tiplu: MarriageCard | null): boolean {
  if (!tiplu) {
    return false;
  }
  const naturals = cards.filter((card) => !isWildCard(card, tiplu));
  const wildCount = 3 - naturals.length;
  if (wildCount === 0) {
    return isTrial(cards);
  }
  if (wildCount === 3) {
    return true;
  }
  const rank = naturals[0]?.rank;
  if (!rank || naturals.some((card) => card.rank !== rank)) {
    return false;
  }
  const suits = new Set(naturals.map((card) => card.suit));
  return suits.size === naturals.length;
}

export function classifyMeld(
  cardIds: [string, string, string],
  hand: MarriageCard[],
  tiplu: MarriageCard | null,
  requirePure: boolean
): MarriageMeld | null {
  const cards = resolveTriplet(cardIds, hand);
  if (!cards) {
    return null;
  }

  if (isTunnel(cards)) {
    return { type: 'TUNNEL', cardIds: [...cardIds], pure: true };
  }

  if (isPureSequence(cards)) {
    return { type: 'SEQUENCE', cardIds: [...cardIds], pure: true };
  }

  if (requirePure) {
    return null;
  }

  if (isTrial(cards)) {
    return { type: 'TRIAL', cardIds: [...cardIds], pure: true };
  }

  if (isImpureSequence(cards, tiplu)) {
    return { type: 'SEQUENCE', cardIds: [...cardIds], pure: false };
  }

  if (isImpureTrial(cards, tiplu)) {
    return { type: 'TRIAL', cardIds: [...cardIds], pure: false };
  }

  return null;
}

/** Validate a sequence of 3+ cards for layoff / join (tunnels stay length 3). */
export function classifyOpenSequence(
  cardIds: string[],
  pool: MarriageCard[],
  tiplu: MarriageCard | null
): MarriageMeld | null {
  const cards = resolveCards(cardIds, pool);
  if (!cards || cards.length < 3) {
    return null;
  }
  if (cards.length === 3 && isTunnel(cards)) {
    return { type: 'TUNNEL', cardIds: [...cardIds], pure: true };
  }
  if (isPureSequenceCards(cards)) {
    return { type: 'SEQUENCE', cardIds: [...cardIds], pure: true };
  }
  if (isImpureSequenceCards(cards, tiplu)) {
    return { type: 'SEQUENCE', cardIds: [...cardIds], pure: false };
  }
  return null;
}

export function validateOpenMelds(
  melds: Array<[string, string, string]>,
  hand: MarriageCard[],
  tiplu: MarriageCard | null
): MarriageMeld[] | null {
  if (melds.length !== 3) {
    return null;
  }
  const used = new Set<string>();
  const result: MarriageMeld[] = [];
  for (const ids of melds) {
    for (const id of ids) {
      if (used.has(id)) {
        return null;
      }
      used.add(id);
    }
    const meld = classifyMeld(ids, hand, tiplu, true);
    if (!meld || !meld.pure) {
      return null;
    }
    if (meld.type !== 'SEQUENCE' && meld.type !== 'TUNNEL') {
      return null;
    }
    result.push(meld);
  }
  return result;
}

/** True when the hand contains three disjoint pure sequences and/or tunnels. */
export function handHasThreePureOpens(
  hand: MarriageCard[],
  tiplu: MarriageCard | null = null
): boolean {
  return findThreePureOpenMelds(hand, tiplu) != null;
}

/** Suggest three pure open melds from a hand (phase-agnostic). */
export function findThreePureOpenMelds(
  hand: MarriageCard[],
  tiplu: MarriageCard | null = null
): Array<[string, string, string]> | null {
  const pure: Array<[string, string, string]> = [];
  for (let i = 0; i < hand.length; i += 1) {
    for (let j = i + 1; j < hand.length; j += 1) {
      for (let k = j + 1; k < hand.length; k += 1) {
        const ids: [string, string, string] = [hand[i]!.id, hand[j]!.id, hand[k]!.id];
        const meld = classifyMeld(ids, hand, tiplu, true);
        if (meld && meld.pure && (meld.type === 'SEQUENCE' || meld.type === 'TUNNEL')) {
          pure.push(ids);
        }
      }
    }
  }
  for (let i = 0; i < pure.length; i += 1) {
    for (let j = i + 1; j < pure.length; j += 1) {
      for (let k = j + 1; k < pure.length; k += 1) {
        const a = pure[i]!;
        const b = pure[j]!;
        const c = pure[k]!;
        const ids = [...a, ...b, ...c];
        if (new Set(ids).size === 9) {
          return [a, b, c];
        }
      }
    }
  }
  return null;
}

/** Partition remaining hand into three-card melds (allows impure once opened / tiplu set). */
export function canPartitionHand(
  hand: MarriageCard[],
  tiplu: MarriageCard | null
): MarriageMeld[] | null {
  if (hand.length === 0) {
    return [];
  }
  if (hand.length % 3 !== 0) {
    return null;
  }
  return partitionFrom(hand, tiplu, 0);
}

function partitionFrom(
  hand: MarriageCard[],
  tiplu: MarriageCard | null,
  start: number
): MarriageMeld[] | null {
  if (start >= hand.length) {
    return [];
  }
  const first = hand[start];
  if (!first) {
    return [];
  }
  for (let j = start + 1; j < hand.length; j += 1) {
    for (let k = j + 1; k < hand.length; k += 1) {
      const a = hand[start]!;
      const b = hand[j]!;
      const c = hand[k]!;
      const ids: [string, string, string] = [a.id, b.id, c.id];
      const meld = classifyMeld(ids, hand, tiplu, false);
      if (!meld) {
        continue;
      }
      const rest = hand.filter((_, index) => index !== start && index !== j && index !== k);
      const nested = partitionFrom(rest, tiplu, 0);
      if (nested) {
        return [meld, ...nested];
      }
    }
  }
  return null;
}

export function sortHand(cards: MarriageCard[]): MarriageCard[] {
  return [...cards].sort((left, right) => {
    if (left.suit !== right.suit) {
      return left.suit.localeCompare(right.suit);
    }
    return MARRIAGE_RANK_VALUE[left.rank] - MARRIAGE_RANK_VALUE[right.rank];
  });
}

export type { MarriageMeldType };
