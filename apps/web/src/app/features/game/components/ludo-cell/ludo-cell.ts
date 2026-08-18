import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { BoardCell, LudoPiece, LudoPlayer } from '@ludo-game/shared-types';
import { PLAYER_SWATCH, PLAYER_TRACK } from '../../models/theme';
import { LudoPieceComponent } from '../ludo-piece/ludo-piece';

export interface CellPieceView {
  piece: LudoPiece;
  player: LudoPlayer;
  highlighted: boolean;
  selectable: boolean;
}

@Component({
  selector: 'ludo-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LudoPieceComponent],
  template: `
    <div
      class="relative h-full w-full border border-black/20"
      [style.background]="background()"
    >
      @if (cell().kind === 'SAFE' || cell().kind === 'START') {
        <span class="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] text-black/50">★</span>
      }
      @if (cell().kind === 'CENTER') {
        <span class="absolute inset-2 rotate-45 rounded-sm bg-arena-gold/90"></span>
      }
      <div class="absolute inset-0 flex items-center justify-center">
        @for (entry of pieces(); track entry.piece.id; let i = $index) {
          <div
            class="absolute flex items-center justify-center"
            [style.transform]="stackTransform(i, pieces().length)"
          >
            <ludo-piece
              [pieceId]="entry.piece.id"
              [color]="entry.player.color"
              [highlighted]="entry.highlighted"
              [selectable]="entry.selectable"
              [label]="entry.player.name + ' piece'"
              (pieceSelect)="pieceSelect.emit($event)"
            />
          </div>
        }
      </div>
    </div>
  `,
})
export class LudoCellComponent {
  readonly cell = input.required<BoardCell>();
  readonly pieces = input<CellPieceView[]>([]);
  readonly pieceSelect = output<string>();

  readonly background = computed(() => {
    const cell = this.cell();
    if (cell.kind === 'YARD' || cell.kind === 'YARD_SLOT') {
      return cell.color ? PLAYER_TRACK[cell.color] : '#172038';
    }
    if (cell.kind === 'HOME_PATH' || cell.kind === 'HOME_TRIANGLE' || cell.kind === 'START') {
      return cell.color ? PLAYER_SWATCH[cell.color] : '#f3efe4';
    }
    if (cell.kind === 'SAFE') {
      return '#efe6c9';
    }
    if (cell.kind === 'CENTER') {
      return '#10182b';
    }
    return '#f3efe4';
  });

  stackTransform(index: number, total: number): string {
    if (total <= 1) {
      return 'translate(0, 0)';
    }
    const angle = (Math.PI * 2 * index) / total;
    const radius = 18;
    return `translate(${Math.cos(angle) * radius}%, ${Math.sin(angle) * radius}%)`;
  }
}
