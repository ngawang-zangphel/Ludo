import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { BoardCoordinate, GameState, LudoPiece, LudoPlayer } from '@ludo-game/shared-types';
import { getBoardLayout } from '@ludo-game/game-engine';
import { CellPieceView, LudoCellComponent } from '../ludo-cell/ludo-cell';

@Component({
  selector: 'ludo-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LudoCellComponent],
  template: `
    <div class="ludo-board-grid relative">
      @for (row of layout; track $index; let r = $index) {
        @for (cell of row; track cell.row + '-' + cell.col) {
          <ludo-cell
            [cell]="cell"
            [pieces]="piecesAt(cell.row, cell.col)"
            (pieceSelect)="pieceSelect.emit($event)"
          />
        }
      }
    </div>
  `,
})
export class LudoBoardComponent {
  readonly state = input.required<GameState>();
  readonly displayCoords = input<Record<string, BoardCoordinate>>({});
  readonly interactive = input(true);
  readonly highlightValid = input(true);
  readonly pieceSelect = output<string>();

  readonly layout = getBoardLayout();

  private readonly pieceIndex = computed(() => {
    const items: Array<{
      piece: LudoPiece;
      player: LudoPlayer;
      coord: BoardCoordinate;
    }> = [];
    const coords = this.displayCoords();
    for (const player of this.state().players) {
      for (const piece of player.pieces) {
        items.push({
          piece,
          player,
          coord: coords[piece.id] ?? { row: 0, col: 0 },
        });
      }
    }
    return items;
  });

  piecesAt(row: number, col: number): CellPieceView[] {
    const valid = new Set(this.state().validPieceIds);
    const interactive = this.interactive();
    const highlightValid = this.highlightValid();
    return this.pieceIndex()
      .filter((item) => item.coord.row === row && item.coord.col === col)
      .map((item) => ({
        piece: item.piece,
        player: item.player,
        highlighted: highlightValid && valid.has(item.piece.id),
        selectable: interactive && valid.has(item.piece.id),
      }));
  }
}
