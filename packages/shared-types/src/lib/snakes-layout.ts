import { SNAKES_FINISH_SQUARE } from './coordinates';

export enum SnakesLevelId {
  CLASSIC = 'classic',
  EASY = 'easy',
  HARD = 'hard',
  CUSTOM = 'custom',
}

export interface SnakesTeleport {
  from: number;
  to: number;
}

export interface SnakesBoardLayout {
  snakes: SnakesTeleport[];
  ladders: SnakesTeleport[];
}

export type SnakesEditorTool = 'snake' | 'ladder' | 'erase';

export interface SnakesBoardClickResult {
  layout: SnakesBoardLayout;
  pendingFrom: number | null;
  error: string | null;
  message: string | null;
}

export const SNAKES_LEVEL_LABEL: Record<SnakesLevelId, string> = {
  [SnakesLevelId.CLASSIC]: 'Classic',
  [SnakesLevelId.EASY]: 'Easy',
  [SnakesLevelId.HARD]: 'Hard',
  [SnakesLevelId.CUSTOM]: 'Custom',
};

export const SNAKES_LEVELS: ReadonlyArray<{
  id: SnakesLevelId;
  name: string;
  description: string;
}> = [
  { id: SnakesLevelId.CLASSIC, name: 'Classic', description: 'Balanced snakes and ladders' },
  { id: SnakesLevelId.EASY, name: 'Easy', description: 'Fewer snakes, more ladders' },
  { id: SnakesLevelId.HARD, name: 'Hard', description: 'Longer snakes, fewer ladders' },
  { id: SnakesLevelId.CUSTOM, name: 'Custom', description: 'Place your own snakes and ladders' },
];

export const SNAKES_PRESETS = SNAKES_LEVELS.filter((level) => level.id !== SnakesLevelId.CUSTOM);

/** Cartoon-board teleports. Key is the landing square; value is the destination. */
export const CLASSIC_SNAKES_TELEPORTS: Readonly<Record<number, number>> = {
  8: 30,
  15: 44,
  21: 50,
  26: 10,
  36: 62,
  46: 18,
  49: 72,
  55: 2,
  60: 23,
  65: 47,
  66: 93,
  77: 96,
  82: 61,
  83: 98,
  88: 67,
  92: 51,
  99: 70,
};

const EASY_SNAKES_TELEPORTS: Readonly<Record<number, number>> = {
  8: 30,
  15: 44,
  21: 50,
  26: 10,
  36: 62,
  46: 18,
  49: 72,
  65: 47,
  66: 93,
  77: 96,
  82: 61,
  83: 98,
  88: 67,
};

const HARD_SNAKES_TELEPORTS: Readonly<Record<number, number>> = {
  8: 30,
  21: 50,
  26: 10,
  32: 7,
  42: 17,
  46: 18,
  49: 72,
  55: 2,
  60: 23,
  65: 47,
  74: 28,
  77: 96,
  82: 61,
  88: 67,
  92: 51,
  95: 34,
  99: 70,
};

export function layoutFromTeleports(teleports: Readonly<Record<number, number>>): SnakesBoardLayout {
  const snakes: SnakesTeleport[] = [];
  const ladders: SnakesTeleport[] = [];
  for (const [fromRaw, to] of Object.entries(teleports)) {
    const from = Number(fromRaw);
    const item = { from, to };
    if (to > from) {
      ladders.push(item);
    } else if (to < from) {
      snakes.push(item);
    }
  }
  return {
    snakes: snakes.sort((left, right) => left.from - right.from),
    ladders: ladders.sort((left, right) => left.from - right.from),
  };
}

export const CLASSIC_SNAKES_LAYOUT = layoutFromTeleports(CLASSIC_SNAKES_TELEPORTS);
export const EASY_SNAKES_LAYOUT = layoutFromTeleports(EASY_SNAKES_TELEPORTS);
export const HARD_SNAKES_LAYOUT = layoutFromTeleports(HARD_SNAKES_TELEPORTS);

export const EMPTY_SNAKES_LAYOUT: SnakesBoardLayout = { snakes: [], ladders: [] };

export const SNAKES_LEVEL_LAYOUTS: Record<Exclude<SnakesLevelId, SnakesLevelId.CUSTOM>, SnakesBoardLayout> = {
  [SnakesLevelId.CLASSIC]: CLASSIC_SNAKES_LAYOUT,
  [SnakesLevelId.EASY]: EASY_SNAKES_LAYOUT,
  [SnakesLevelId.HARD]: HARD_SNAKES_LAYOUT,
};

export function emptySnakesLayout(): SnakesBoardLayout {
  return { snakes: [], ladders: [] };
}

export function cloneSnakesLayout(layout: SnakesBoardLayout): SnakesBoardLayout {
  return {
    snakes: layout.snakes.map((item) => ({ ...item })),
    ladders: layout.ladders.map((item) => ({ ...item })),
  };
}

export function teleportsFromLayout(layout: SnakesBoardLayout): Record<number, number> {
  const teleports: Record<number, number> = {};
  for (const item of [...layout.ladders, ...layout.snakes]) {
    teleports[item.from] = item.to;
  }
  return teleports;
}

export function snakesLayoutStarts(layout: SnakesBoardLayout): Set<number> {
  return new Set([...layout.snakes, ...layout.ladders].map((item) => item.from));
}

export function validateSnakesLayout(layout: SnakesBoardLayout): string | null {
  const seen = new Set<number>();
  for (const item of layout.ladders) {
    const error = validateTeleport(item, 'ladder', seen);
    if (error) {
      return error;
    }
  }
  for (const item of layout.snakes) {
    const error = validateTeleport(item, 'snake', seen);
    if (error) {
      return error;
    }
  }
  return null;
}

export function applySnakesBoardClick(
  layout: SnakesBoardLayout,
  square: number,
  tool: SnakesEditorTool,
  pendingFrom: number | null
): SnakesBoardClickResult {
  if (tool === 'erase') {
    const next = removeOccupying(layout, square);
    const removed = next.snakes.length !== layout.snakes.length || next.ladders.length !== layout.ladders.length;
    return {
      layout: next,
      pendingFrom: null,
      error: null,
      message: removed ? `Removed the piece on ${square}.` : 'Nothing to remove on that square.',
    };
  }

  if (pendingFrom === square) {
    return { layout, pendingFrom: null, error: null, message: 'Placement cancelled.' };
  }

  if (pendingFrom == null) {
    if (hasStart(layout, square)) {
      return {
        layout: removeStart(layout, square),
        pendingFrom: null,
        error: null,
        message: `Removed the ${toolLabel(startKind(layout, square))} on ${square}.`,
      };
    }
    if (square === 1 || square === SNAKES_FINISH_SQUARE) {
      return {
        layout,
        pendingFrom: null,
        error: 'Cannot start a snake or ladder on GO or 100.',
        message: null,
      };
    }
    return {
      layout,
      pendingFrom: square,
      error: null,
      message: tool === 'snake' ? `Head on ${square}. Now click the tail.` : `Bottom on ${square}. Now click the top.`,
    };
  }

  if (hasStart(layout, pendingFrom)) {
    return { layout, pendingFrom: null, error: 'That square already has a snake or ladder.', message: null };
  }

  if (tool === 'snake' && square >= pendingFrom) {
    return {
      layout,
      pendingFrom,
      error: 'Snake tail must be a lower number than the head.',
      message: null,
    };
  }
  if (tool === 'ladder' && square <= pendingFrom) {
    return {
      layout,
      pendingFrom,
      error: 'Ladder top must be a higher number than the bottom.',
      message: null,
    };
  }

  const next: SnakesBoardLayout =
    tool === 'snake'
      ? { snakes: [...layout.snakes, { from: pendingFrom, to: square }], ladders: layout.ladders }
      : { snakes: layout.snakes, ladders: [...layout.ladders, { from: pendingFrom, to: square }] };
  const error = validateSnakesLayout(next);
  if (error) {
    return { layout, pendingFrom, error, message: null };
  }
  return {
    layout: next,
    pendingFrom: null,
    error: null,
    message: tool === 'snake' ? `Snake ${pendingFrom} → ${square}` : `Ladder ${pendingFrom} → ${square}`,
  };
}

function validateTeleport(
  item: SnakesTeleport,
  kind: 'snake' | 'ladder',
  seen: Set<number>
): string | null {
  if (!Number.isInteger(item.from) || !Number.isInteger(item.to)) {
    return 'Squares must be whole numbers.';
  }
  if (item.from < 1 || item.from > SNAKES_FINISH_SQUARE || item.to < 1 || item.to > SNAKES_FINISH_SQUARE) {
    return 'Snakes and ladders must stay on squares 1–100.';
  }
  if (item.from === 1 || item.from === SNAKES_FINISH_SQUARE) {
    return 'Cannot start a snake or ladder on GO or 100.';
  }
  if (item.from === item.to) {
    return 'A snake or ladder needs two different squares.';
  }
  if (kind === 'snake' && item.to >= item.from) {
    return `Snake ${item.from} must go down.`;
  }
  if (kind === 'ladder' && item.to <= item.from) {
    return `Ladder ${item.from} must go up.`;
  }
  if (seen.has(item.from)) {
    return `Square ${item.from} already has a snake or ladder.`;
  }
  seen.add(item.from);
  return null;
}

function hasStart(layout: SnakesBoardLayout, square: number): boolean {
  return snakesLayoutStarts(layout).has(square);
}

function startKind(layout: SnakesBoardLayout, square: number): 'snake' | 'ladder' | null {
  if (layout.snakes.some((item) => item.from === square)) {
    return 'snake';
  }
  if (layout.ladders.some((item) => item.from === square)) {
    return 'ladder';
  }
  return null;
}

function removeStart(layout: SnakesBoardLayout, square: number): SnakesBoardLayout {
  return {
    snakes: layout.snakes.filter((item) => item.from !== square),
    ladders: layout.ladders.filter((item) => item.from !== square),
  };
}

function removeOccupying(layout: SnakesBoardLayout, square: number): SnakesBoardLayout {
  return {
    snakes: layout.snakes.filter((item) => item.from !== square && item.to !== square),
    ladders: layout.ladders.filter((item) => item.from !== square && item.to !== square),
  };
}

function toolLabel(kind: 'snake' | 'ladder' | null): string {
  if (kind === 'snake') {
    return 'snake';
  }
  if (kind === 'ladder') {
    return 'ladder';
  }
  return 'piece';
}
