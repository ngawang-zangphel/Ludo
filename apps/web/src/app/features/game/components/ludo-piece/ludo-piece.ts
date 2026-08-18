import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PlayerColor } from '@ludo-game/shared-types';
import { PLAYER_SWATCH } from '../../models/theme';

@Component({
  selector: 'ludo-piece',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="piece-token relative flex items-center justify-center"
      [class.is-valid]="highlighted()"
      [class.cursor-pointer]="selectable()"
      [class.cursor-default]="!selectable()"
      [style.background]="PLAYER_SWATCH[color()]"
      [style.color]="PLAYER_SWATCH[color()]"
      [disabled]="!selectable()"
      (click)="pieceSelect.emit(pieceId())"
      [attr.aria-label]="label()"
    >
      <span class="absolute inset-[18%] rounded-full bg-white/25"></span>
      <span class="relative h-2 w-2 rounded-full bg-white/90"></span>
    </button>
  `,
})
export class LudoPieceComponent {
  readonly PLAYER_SWATCH = PLAYER_SWATCH;
  readonly pieceId = input.required<string>();
  readonly color = input.required<PlayerColor>();
  readonly highlighted = input(false);
  readonly selectable = input(false);
  readonly label = input('Piece');
  readonly pieceSelect = output<string>();
}
