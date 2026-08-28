import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PLAYER_SWATCH } from '../../models/theme';
import { PlaceCelebration } from '../../models/celebration';
import { placeLabel } from '../../../../shared/format';

@Component({
  selector: 'arena-finish-celebration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (celebration(); as toast) {
      <div class="finish-celebration" aria-live="assertive">
        <div class="finish-celebration-burst" aria-hidden="true">
          @for (piece of pieces; track $index) {
            <span class="confetti-piece" [style.--n]="$index" [style.--hue]="piece.hue"></span>
          }
        </div>
        <div class="finish-celebration-card">
          <p class="finish-celebration-kicker">{{ placeLabel(toast.place) }} place</p>
          <p class="finish-celebration-name" [style.color]="PLAYER_SWATCH[toast.color]">
            {{ toast.name }}
          </p>
          <p class="finish-celebration-sub">{{ toast.place === 1 ? 'Takes the lead!' : 'Finished the board!' }}</p>
        </div>
      </div>
    }
  `,
})
export class FinishCelebrationComponent {
  readonly PLAYER_SWATCH = PLAYER_SWATCH;
  readonly placeLabel = placeLabel;
  readonly celebration = input<PlaceCelebration | null>(null);
  readonly pieces = Array.from({ length: 42 }, (_, index) => ({
    hue: (index * 47) % 360,
  }));
}
