import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlayerColor, TurnPhase } from '@ludo-game/shared-types';
import { PLAYER_SWATCH } from '../../models/theme';

@Component({
  selector: 'ludo-turn-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="arena-turn">
      @if (phase() === 'MATCH_OVER') {
        <p class="text-[0.65rem] uppercase tracking-[0.22em] text-arena-gold/80">Match</p>
        <p class="mt-1 font-display text-xl font-semibold text-arena-gold">Complete</p>
      } @else if (player(); as current) {
        <p class="text-[0.65rem] uppercase tracking-[0.22em] text-arena-mist/50">Now playing</p>
        <p class="mt-1 font-display text-xl font-semibold leading-tight" [style.color]="PLAYER_SWATCH[current.color]">
          {{ current.name }}
        </p>
        <p class="mt-1 text-sm text-arena-mist/70">
          {{ phase() === 'WAITING_FOR_ROLL' ? 'Roll the dice' : hint() }}
        </p>
      }
    </div>
  `,
})
export class TurnIndicatorComponent {
  readonly PLAYER_SWATCH = PLAYER_SWATCH;
  readonly player = input<{ name: string; color: PlayerColor } | null>(null);
  readonly phase = input<TurnPhase>(TurnPhase.WAITING_FOR_ROLL);
  readonly hint = input('Choose a highlighted piece');
}
