import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BoardCell } from '@ludo-game/shared-types';
import { PLAYER_SWATCH, PLAYER_TRACK } from '../../models/theme';

@Component({
  selector: 'ludo-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="ludo-cell"
      [attr.data-kind]="cell().kind"
      [style.--cell]="background()"
    >
      @if (cell().kind === 'SAFE' || cell().kind === 'START') {
        <svg class="ludo-cell-star" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2.4 14.4 8.6 21 9.3 16.2 13.7 17.6 20.3 12 17.1 6.4 20.3 7.8 13.7 3 9.3 9.6 8.6Z"
          />
        </svg>
      }
      @if (cell().kind === 'CENTER') {
        <span class="ludo-cell-center"></span>
      }
    </div>
  `,
})
export class LudoCellComponent {
  readonly cell = input.required<BoardCell>();

  readonly background = computed(() => {
    const cell = this.cell();
    if (cell.kind === 'YARD') {
      return cell.color ? PLAYER_TRACK[cell.color] : '#141c30';
    }
    if (cell.kind === 'YARD_SLOT') {
      return cell.color ? PLAYER_TRACK[cell.color] : '#141c30';
    }
    if (cell.kind === 'HOME_PATH' || cell.kind === 'HOME_TRIANGLE' || cell.kind === 'START') {
      return cell.color ? PLAYER_SWATCH[cell.color] : '#fff4dc';
    }
    if (cell.kind === 'SAFE') {
      return '#ffe9a8';
    }
    if (cell.kind === 'CENTER') {
      return '#10182b';
    }
    return '#fff4dc';
  });
}
