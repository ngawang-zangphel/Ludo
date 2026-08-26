import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  BoardCoordinate,
  CLASSIC_SNAKES_LAYOUT,
  SNAKES_BOARD_SIZE,
  SnakesBoardLayout,
  SnakesGameState,
  SnakesPlayer,
} from '@ludo-game/shared-types';
import { snakesSquareToCell } from '@ludo-game/game-engine';
import { LudoPieceComponent } from '../ludo-piece/ludo-piece';
import { buildLadderGraphic, buildSnakeGraphic, buildSquares } from './snakes-board.graphics';

interface BoardToken {
  player: SnakesPlayer;
  left: number;
  top: number;
  stackTransform: string;
  zIndex: number;
  moving: boolean;
}

@Component({
  selector: 'arena-snakes-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LudoPieceComponent],
  template: `
    <div class="snakes-board-frame" [class.is-compact]="compact()" [class.is-editable]="editable()">
      <div class="snakes-board-inner">
        <div class="snakes-board-grid">
          @for (square of squares(); track square.number) {
            <button
              type="button"
              class="snakes-square"
              [attr.data-band]="square.band"
              [class.is-dark]="square.checkerDark"
              [class.is-start]="square.kind === 'start'"
              [class.is-finish]="square.kind === 'finish'"
              [class.is-ladder]="square.kind === 'ladder'"
              [class.is-snake]="square.kind === 'snake'"
              [class.is-pending]="pendingSquare() === square.number"
              [disabled]="!editable()"
              (click)="onSquareClick(square.number)"
            >
              <span class="snakes-square-number">{{ square.number === 1 ? '' : square.number }}</span>
              @if (square.number !== 100 && square.number !== 1) {
                <svg class="snakes-chevron" [attr.data-dir]="square.dir" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 6 L12 12 L5 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M13 6 L20 12 L13 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              }
              @if (square.number === 1) {
                <span class="snakes-start-badge">GO</span>
              }
              @if (square.number === 100) {
                <span class="snakes-flag" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 21V4" stroke="#7f1d1d" stroke-width="2.2" stroke-linecap="round" />
                    <path d="M6.2 4.2h12.2l-3 3.8 3 3.8H6.2V4.2Z" fill="#ef4444" />
                    <circle cx="5" cy="21" r="1.4" fill="#7f1d1d" />
                  </svg>
                </span>
              }
            </button>
          }
        </div>

        <svg class="snakes-overlay" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <filter [attr.id]="gfxId + '-shadow'" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0.55" dy="0.75" stdDeviation="0.5" flood-color="#1a1208" flood-opacity="0.38" />
            </filter>
            <linearGradient [attr.id]="gfxId + '-ladder'" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fff1c4" />
              <stop offset="42%" stop-color="#e4b14a" />
              <stop offset="100%" stop-color="#9a6414" />
            </linearGradient>
          </defs>

          @for (ladder of ladders(); track ladder.from) {
            <g [attr.filter]="'url(#' + gfxId + '-shadow)'">
              <line
                [attr.x1]="ladder.backRail.x1"
                [attr.y1]="ladder.backRail.y1"
                [attr.x2]="ladder.backRail.x2"
                [attr.y2]="ladder.backRail.y2"
                stroke="#8a5310"
                stroke-width="1.12"
                stroke-linecap="round"
              />
              <line
                [attr.x1]="ladder.frontRail.x1"
                [attr.y1]="ladder.frontRail.y1"
                [attr.x2]="ladder.frontRail.x2"
                [attr.y2]="ladder.frontRail.y2"
                [attr.stroke]="'url(#' + gfxId + '-ladder)'"
                stroke-width="1.12"
                stroke-linecap="round"
              />
              @for (rung of ladder.rungs; track $index) {
                <line
                  [attr.x1]="rung.x1"
                  [attr.y1]="rung.y1"
                  [attr.x2]="rung.x2"
                  [attr.y2]="rung.y2"
                  stroke="#ffe9a8"
                  stroke-width="0.58"
                  stroke-linecap="round"
                />
              }
              @for (cap of ladder.caps; track $index) {
                <circle [attr.cx]="cap.x" [attr.cy]="cap.y" r="0.5" fill="#fff6d4" />
              }
            </g>
          }

          @for (snake of snakes(); track snake.from) {
            <g [attr.filter]="'url(#' + gfxId + '-shadow)'">
              <path
                [attr.d]="snake.outline"
                [attr.fill]="snake.palette.fill"
                [attr.stroke]="snake.palette.stroke"
                stroke-width="0.2"
                stroke-linejoin="round"
              />
              @for (spot of snake.spots; track $index) {
                <rect
                  [attr.x]="-spot.length / 2"
                  [attr.y]="-spot.width / 2"
                  [attr.width]="spot.length"
                  [attr.height]="spot.width"
                  [attr.rx]="spot.width / 2"
                  [attr.fill]="snake.palette.spot"
                  [attr.transform]="'translate(' + spot.x + ' ' + spot.y + ') rotate(' + spot.angle + ')'"
                />
              }
              <g [attr.transform]="'translate(' + snake.head.x + ' ' + snake.head.y + ') rotate(' + snake.angle + ')'">
                <ellipse cx="0.22" cy="0" rx="1.22" ry="0.96" [attr.fill]="snake.palette.fill" [attr.stroke]="snake.palette.stroke" stroke-width="0.18" />
                <circle cx="0.58" cy="-0.26" r="0.16" fill="#171717" />
                <circle cx="0.58" cy="0.26" r="0.16" fill="#171717" />
                <circle cx="0.52" cy="-0.3" r="0.05" fill="#fff" />
                <circle cx="0.52" cy="0.22" r="0.05" fill="#fff" />
                <path
                  d="M1.22 0 L1.68 -0.2 M1.22 0 L1.68 0.2"
                  stroke="#e53935"
                  stroke-width="0.14"
                  fill="none"
                  stroke-linecap="round"
                />
              </g>
            </g>
          }
        </svg>

        <div class="pointer-events-none absolute inset-0">
          @for (token of tokens(); track token.player.tokenId) {
            <div
              class="snakes-piece-float"
              [class.is-moving]="token.moving"
              [class.is-hop-a]="token.moving && hopTick() % 2 === 1"
              [class.is-hop-b]="token.moving && hopTick() > 0 && hopTick() % 2 === 0"
              [style.left.%]="token.left"
              [style.top.%]="token.top"
              [style.z-index]="token.zIndex"
            >
              <div
                class="absolute inset-x-[8%] bottom-[4%] top-[6%] flex items-end justify-center"
                [style.transform]="token.stackTransform"
              >
                <ludo-piece
                  [pieceId]="token.player.tokenId"
                  [color]="token.player.color"
                  [label]="token.player.name + ' token'"
                />
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class SnakesBoardComponent {
  private static nextGfxId = 0;
  readonly gfxId = `snakes-gfx-${++SnakesBoardComponent.nextGfxId}`;
  readonly state = input<SnakesGameState | null>(null);
  readonly layout = input<SnakesBoardLayout | null>(null);
  readonly displayCoords = input<Record<string, BoardCoordinate>>({});
  readonly movingPieceId = input<string | null>(null);
  readonly hopTick = input(0);
  readonly editable = input(false);
  readonly pendingSquare = input<number | null>(null);
  readonly compact = input(false);
  readonly squareSelect = output<number>();

  readonly resolvedLayout = computed(
    () => this.layout() ?? this.state()?.rules.layout ?? CLASSIC_SNAKES_LAYOUT
  );
  readonly squares = computed(() => buildSquares(this.resolvedLayout()));
  readonly ladders = computed(() =>
    this.resolvedLayout().ladders.map((ladder) => buildLadderGraphic(ladder.from, ladder.to))
  );
  readonly snakes = computed(() =>
    this.resolvedLayout().snakes.map((snake, index) => buildSnakeGraphic(snake.from, snake.to, index))
  );

  readonly tokens = computed(() => {
    const match = this.state();
    if (!match) {
      return [] as BoardToken[];
    }
    const coords = this.displayCoords();
    const movingId = this.movingPieceId();
    const groups = new Map<string, Array<{ player: SnakesPlayer; coord: BoardCoordinate }>>();

    for (const player of match.players) {
      const coord = coords[player.tokenId] ?? snakesSquareToCell(player.position);
      const key = `${coord.row.toFixed(2)}:${coord.col.toFixed(2)}`;
      const group = groups.get(key) ?? [];
      group.push({ player, coord });
      groups.set(key, group);
    }

    const tokens: BoardToken[] = [];
    for (const group of groups.values()) {
      group.forEach((item, index) => {
        const moving = item.player.tokenId === movingId;
        tokens.push({
          player: item.player,
          left: (item.coord.col / SNAKES_BOARD_SIZE) * 100,
          top: (item.coord.row / SNAKES_BOARD_SIZE) * 100,
          stackTransform: stackOffset(index, group.length),
          zIndex: moving ? 40 : 5 + index,
          moving,
        });
      });
    }
    return tokens;
  });

  onSquareClick(square: number): void {
    if (this.editable()) {
      this.squareSelect.emit(square);
    }
  }
}

function stackOffset(index: number, total: number): string {
  if (total <= 1) {
    return 'translate(0, 0)';
  }
  const angle = (Math.PI * 2 * index) / total;
  const radius = 16;
  return `translate(${Math.cos(angle) * radius}%, ${Math.sin(angle) * radius}%)`;
}
