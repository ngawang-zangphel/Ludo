import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { BOARD_SIZE, BoardCoordinate, LudoGameState, LudoPiece, LudoPlayer, PieceState } from '@ludo-game/shared-types';
import { getBoardLayout } from '@ludo-game/game-engine';
import { PLAYER_SWATCH } from '../../models/theme';
import { LudoCellComponent } from '../ludo-cell/ludo-cell';
import { LudoPieceComponent } from '../ludo-piece/ludo-piece';

interface BoardToken {
  piece: LudoPiece;
  player: LudoPlayer;
  left: number;
  top: number;
  stackTransform: string;
  zIndex: number;
  highlighted: boolean;
  selectable: boolean;
  moving: boolean;
  inYard: boolean;
}

@Component({
  selector: 'ludo-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LudoCellComponent, LudoPieceComponent],
  template: `
    <div class="ludo-board-frame">
      <div class="ludo-board-inner">
        <div class="ludo-board-grid">
          @for (row of layout; track $index) {
            @for (cell of row; track cell.row + '-' + cell.col) {
              <ludo-cell [cell]="cell" />
            }
          }
        </div>
        <div class="pointer-events-none absolute inset-0">
          @for (label of yardLabels(); track label.color) {
            <div
              class="ludo-home-pad"
              [attr.data-color]="label.color"
              [style.--pad-color]="PLAYER_SWATCH[label.color]"
            >
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p class="ludo-yard-name" [attr.data-color]="label.color">{{ label.name }}</p>
          }
          @for (token of tokens(); track token.piece.id) {
            <div
              class="piece-float"
              [class.is-yard]="token.inYard"
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
                  [pieceId]="token.piece.id"
                  [color]="token.player.color"
                  [highlighted]="token.highlighted"
                  [selectable]="token.selectable"
                  [label]="token.player.name + ' piece'"
                  (pieceSelect)="pieceSelect.emit($event)"
                />
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class LudoBoardComponent {
  readonly PLAYER_SWATCH = PLAYER_SWATCH;
  readonly state = input.required<LudoGameState>();
  readonly displayCoords = input<Record<string, BoardCoordinate>>({});
  readonly interactive = input(true);
  readonly highlightValid = input(true);
  readonly movingPieceId = input<string | null>(null);
  readonly hopTick = input(0);
  readonly pieceSelect = output<string>();

  readonly layout = getBoardLayout();

  readonly tokens = computed(() => {
    const coords = this.displayCoords();
    const valid = new Set(this.state().validPieceIds);
    const interactive = this.interactive();
    const highlightValid = this.highlightValid();
    const movingId = this.movingPieceId();
    const groups = new Map<string, Array<{ piece: LudoPiece; player: LudoPlayer; coord: BoardCoordinate }>>();

    for (const player of this.state().players) {
      for (const piece of player.pieces) {
        const coord = coords[piece.id] ?? { row: 0, col: 0 };
        const key = `${coord.row}:${coord.col}`;
        const group = groups.get(key) ?? [];
        group.push({ piece, player, coord });
        groups.set(key, group);
      }
    }

    const tokens: BoardToken[] = [];
    for (const group of groups.values()) {
      group.forEach((item, index) => {
        const moving = item.piece.id === movingId;
        tokens.push({
          piece: item.piece,
          player: item.player,
          left: (item.coord.col / BOARD_SIZE) * 100,
          top: (item.coord.row / BOARD_SIZE) * 100,
          stackTransform: stackOffset(index, group.length),
          zIndex: moving ? 40 : 5 + index,
          highlighted: !moving && highlightValid && valid.has(item.piece.id),
          selectable: !moving && interactive && valid.has(item.piece.id),
          moving,
          inYard: item.piece.state === PieceState.YARD,
        });
      });
    }
    return tokens;
  });

  readonly yardLabels = computed(() =>
    this.state().players.map((player) => ({
      color: player.color,
      name: player.finishedPosition
        ? `${player.name} · ${placeLabel(player.finishedPosition)}`
        : player.name,
    }))
  );
}

function placeLabel(place: number): string {
  if (place === 1) return '1st';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  return `${place}th`;
}

function stackOffset(index: number, total: number): string {
  if (total <= 1) {
    return 'translate(0, 0)';
  }
  const angle = (Math.PI * 2 * index) / total;
  const radius = 18;
  return `translate(${Math.cos(angle) * radius}%, ${Math.sin(angle) * radius}%)`;
}
