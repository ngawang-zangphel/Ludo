import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LudoPlayer, PieceState } from '@ludo-game/shared-types';
import { PLAYER_SWATCH } from '../../models/theme';

@Component({
  selector: 'ludo-home-path',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-1.5">
      @for (filled of steps(); track $index) {
        <span
          class="h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
          [class.opacity-25]="!filled"
          [style.background]="PLAYER_SWATCH[player().color]"
        ></span>
      }
      <span class="ml-1 text-[11px] uppercase tracking-wider text-arena-mist/55">
        {{ homeCount() }}/4 home
      </span>
    </div>
  `,
})
export class HomePathComponent {
  readonly PLAYER_SWATCH = PLAYER_SWATCH;
  readonly player = input.required<LudoPlayer>();

  readonly homeCount = computed(
    () => this.player().pieces.filter((piece) => piece.state === PieceState.HOME).length
  );

  readonly steps = computed(() => {
    const count = this.homeCount();
    return [0, 1, 2, 3].map((index) => index < count);
  });
}
