import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LudoPlayer, TurnPhase } from '@ludo-game/shared-types';
import { PLAYER_SWATCH } from '../../models/theme';

@Component({
  selector: 'ludo-turn-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-2xl border border-arena-line bg-arena-navy/80 px-5 py-4 text-center">
      @if (phase() === 'MATCH_OVER') {
        <p class="font-display text-xl text-arena-gold">Match complete</p>
      } @else if (player(); as current) {
        <p class="text-xs uppercase tracking-[0.24em] text-arena-mist/50">Now playing</p>
        <p class="mt-1 font-display text-2xl font-semibold" [style.color]="PLAYER_SWATCH[current.color]">
          {{ current.name }}
        </p>
        <p class="mt-1 text-sm text-arena-mist/70">
          {{ phase() === 'WAITING_FOR_ROLL' ? 'Roll the dice' : 'Choose a highlighted piece' }}
        </p>
      }
    </div>
  `,
})
export class TurnIndicatorComponent {
  readonly PLAYER_SWATCH = PLAYER_SWATCH;
  readonly player = input<LudoPlayer | null>(null);
  readonly phase = input<TurnPhase>(TurnPhase.WAITING_FOR_ROLL);
}
