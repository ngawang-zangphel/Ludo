import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LudoPiece, LudoPlayer, PieceState } from '@ludo-game/shared-types';
import { LudoPieceComponent } from '../ludo-piece/ludo-piece';

@Component({
  selector: 'ludo-player-yard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LudoPieceComponent],
  template: `
    <div class="grid grid-cols-2 gap-2 rounded-xl bg-black/25 p-2.5">
      @for (piece of yardPieces(); track piece.id) {
        <div class="flex h-14 w-full items-end justify-center">
          <ludo-piece
            [pieceId]="piece.id"
            [color]="player().color"
            [highlighted]="validIds().includes(piece.id)"
            [selectable]="validIds().includes(piece.id)"
            (pieceSelect)="pieceSelect.emit($event)"
          />
        </div>
      }
    </div>
  `,
})
export class PlayerYardComponent {
  readonly player = input.required<LudoPlayer>();
  readonly validPieceIds = input<string[]>([]);
  readonly hiddenPieceId = input<string | null>(null);
  readonly pieceSelect = output<string>();

  readonly validIds = computed(() => this.validPieceIds());
  readonly yardPieces = computed(() =>
    this.player().pieces.filter(
      (piece: LudoPiece) => piece.state === PieceState.YARD && piece.id !== this.hiddenPieceId()
    )
  );
}
