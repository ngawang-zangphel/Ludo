import { SNAKES_BOARD_SIZE, SnakesBoardLayout } from '@ludo-game/shared-types';
import { snakesSquareToCell } from '@ludo-game/game-engine';

export interface Point {
  x: number;
  y: number;
}

export interface LadderGraphic {
  from: number;
  to: number;
  backRail: { x1: number; y1: number; x2: number; y2: number };
  frontRail: { x1: number; y1: number; x2: number; y2: number };
  rungs: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  caps: Array<{ x: number; y: number }>;
}

export interface SnakeSpot {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
}

export interface SnakeGraphic {
  from: number;
  to: number;
  outline: string;
  spots: SnakeSpot[];
  head: Point;
  angle: number;
}

export type TravelDir = 'left' | 'right' | 'up';
export type SquareKind = 'normal' | 'start' | 'finish' | 'ladder' | 'snake';

export interface BoardSquare {
  number: number;
  row: number;
  col: number;
  dir: TravelDir;
  checkerDark: boolean;
  kind: SquareKind;
}

export function cellCenter(square: number): Point {
  const cell = snakesSquareToCell(square);
  return {
    x: ((cell.col + 0.5) / SNAKES_BOARD_SIZE) * 100,
    y: ((cell.row + 0.5) / SNAKES_BOARD_SIZE) * 100,
  };
}

export function buildSquares(layout: SnakesBoardLayout): BoardSquare[] {
  const ladderSquares = new Set(layout.ladders.flatMap((item) => [item.from, item.to]));
  const snakeSquares = new Set(layout.snakes.flatMap((item) => [item.from, item.to]));
  const squares: BoardSquare[] = [];
  for (let number = 1; number <= 100; number += 1) {
    const cell = snakesSquareToCell(number);
    squares.push({
      number,
      row: cell.row,
      col: cell.col,
      dir: travelDir(number),
      checkerDark: (Math.round(cell.row) + Math.round(cell.col)) % 2 === 1,
      kind: squareKind(number, ladderSquares, snakeSquares),
    });
  }
  return squares.sort((left, right) => left.row - right.row || left.col - right.col);
}

function squareKind(number: number, ladderSquares: Set<number>, snakeSquares: Set<number>): SquareKind {
  if (number === 1) return 'start';
  if (number === 100) return 'finish';
  if (ladderSquares.has(number)) return 'ladder';
  if (snakeSquares.has(number)) return 'snake';
  return 'normal';
}

function travelDir(number: number): TravelDir {
  if (number >= 100) {
    return 'up';
  }
  const here = snakesSquareToCell(number);
  const next = snakesSquareToCell(number + 1);
  if (Math.abs(next.col - here.col) > 0.4) {
    return next.col > here.col ? 'right' : 'left';
  }
  return 'up';
}

export function buildLadderGraphic(from: number, to: number): LadderGraphic {
  const start = cellCenter(from);
  const end = cellCenter(to);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const halfStart = 1.35;
  const halfEnd = 1.15;
  const inset = 0.4;
  const a1 = offset(start, ux, uy, inset, nx, ny, halfStart);
  const a2 = offset(end, ux, uy, -inset, nx, ny, halfEnd);
  const b1 = offset(start, ux, uy, inset, nx, ny, -halfStart);
  const b2 = offset(end, ux, uy, -inset, nx, ny, -halfEnd);
  const rungCount = Math.max(4, Math.round(len / 2.6));
  const rungs: LadderGraphic['rungs'] = [];
  for (let index = 1; index <= rungCount; index += 1) {
    const t = index / (rungCount + 1);
    rungs.push({
      x1: lerp(a1.x, a2.x, t),
      y1: lerp(a1.y, a2.y, t),
      x2: lerp(b1.x, b2.x, t),
      y2: lerp(b1.y, b2.y, t),
    });
  }
  return {
    from,
    to,
    backRail: { x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y },
    frontRail: { x1: b1.x, y1: b1.y, x2: b2.x, y2: b2.y },
    rungs,
    caps: [a1, a2, b1, b2],
  };
}

export function buildSnakeGraphic(from: number, to: number, index: number): SnakeGraphic {
  const head = cellCenter(from);
  const tail = cellCenter(to);
  const samples = sampleSnake(head, tail, index);
  const body = samples.slice(3, Math.max(4, samples.length));
  const outline = ribbon(body, 1.72, 0.07);
  const spots: SnakeSpot[] = [];
  const start = Math.round(samples.length * 0.14);
  const end = Math.round(samples.length * 0.9);
  const span = Math.max(4, end - start);
  const spotCount = Math.max(5, Math.round(span / 4.2));
  for (let i = 0; i < spotCount; i += 1) {
    const sampleIndex = start + Math.round(((i + 0.5) / spotCount) * span);
    const sample = samples[sampleIndex];
    if (!sample) {
      continue;
    }
    const t = sampleIndex / Math.max(1, samples.length - 1);
    const local = lerp(1.72, 0.14, t * t * t);
    spots.push({
      x: sample.point.x,
      y: sample.point.y,
      angle: (Math.atan2(sample.tangent.y, sample.tangent.x) * 180) / Math.PI,
      length: Math.max(0.62, local * 1.12),
      width: Math.max(0.32, local * 0.58),
    });
  }
  const first = samples[0];
  const tangent = first?.tangent ?? { x: 1, y: 0 };
  return {
    from,
    to,
    outline,
    spots,
    head,
    angle: (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI + 180,
  };
}

interface Sample {
  point: Point;
  tangent: Point;
}

function sampleSnake(head: Point, tail: Point, index: number): Sample[] {
  const bend = index % 2 === 0 ? 1 : -1;
  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const mag = Math.min(11.5, Math.max(5.2, len * 0.3)) * bend;
  const long = len > 16;
  const extra = long ? mag * 0.22 : mag * 0.08;
  const c1 = {
    x: head.x + ux * len * 0.26 + nx * mag,
    y: head.y + uy * len * 0.26 + ny * mag,
  };
  const c2 = {
    x: head.x + ux * len * 0.74 - nx * mag * (long ? 1 : 0.28),
    y: head.y + uy * len * 0.74 - ny * mag * (long ? 1 : 0.28),
  };
  const count = Math.max(36, Math.round(len * 2.8));
  const samples: Sample[] = [];
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const base = cubicPoint(head, c1, c2, tail, t);
    const tangent = cubicTangent(head, c1, c2, tail, t);
    const tangentLen = Math.hypot(tangent.x, tangent.y) || 1;
    const px = -tangent.y / tangentLen;
    const py = tangent.x / tangentLen;
    const wave = Math.sin(t * Math.PI * (long ? 3 : 2)) * Math.sin(t * Math.PI) * extra;
    samples.push({
      point: { x: base.x + px * wave, y: base.y + py * wave },
      tangent,
    });
  }
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    if (!sample) {
      continue;
    }
    const prev = samples[Math.max(0, i - 1)]?.point ?? sample.point;
    const next = samples[Math.min(samples.length - 1, i + 1)]?.point ?? sample.point;
    sample.tangent = { x: next.x - prev.x, y: next.y - prev.y };
  }
  return samples;
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  return {
    x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
    y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
  };
}

function cubicTangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

function ribbon(samples: Sample[], headWidth: number, tailWidth: number): string {
  const left: Point[] = [];
  const right: Point[] = [];
  samples.forEach((sample, index) => {
    const t = index / Math.max(1, samples.length - 1);
    const width = lerp(headWidth, tailWidth, t * t * t);
    const tangentLen = Math.hypot(sample.tangent.x, sample.tangent.y) || 1;
    const nx = -sample.tangent.y / tangentLen;
    const ny = sample.tangent.x / tangentLen;
    left.push({ x: sample.point.x + nx * width, y: sample.point.y + ny * width });
    right.push({ x: sample.point.x - nx * width, y: sample.point.y - ny * width });
  });
  const loop = [...left, ...right.reverse()];
  const first = loop[0];
  if (!first) {
    return '';
  }
  return `M ${fmt(first.x)} ${fmt(first.y)} ${loop
    .slice(1)
    .map((point) => `L ${fmt(point.x)} ${fmt(point.y)}`)
    .join(' ')} Z`;
}

function offset(
  point: Point,
  ux: number,
  uy: number,
  along: number,
  nx: number,
  ny: number,
  across: number
): Point {
  return {
    x: point.x + ux * along + nx * across,
    y: point.y + uy * along + ny * across,
  };
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function fmt(value: number): string {
  return value.toFixed(2);
}
