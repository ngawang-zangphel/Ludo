import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlayerColor, TurnPhase } from '@ludo-game/shared-types';
import { PLAYER_SWATCH } from '../../models/theme';

@Component({
  selector: 'ludo-turn-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="arena-turn">
      @if (phase() === 'MATCH_OVER') {
        <p class="arena-turn-kicker">Match</p>
        <p class="arena-turn-name text-arena-gold">Complete</p>
      } @else if (player(); as current) {
        <p class="arena-turn-kicker">Now playing</p>
        <p class="arena-turn-name" [style.color]="PLAYER_SWATCH[current.color]">
          {{ current.name }}
        </p>
        <p class="arena-turn-hint arena-turn-hint-full">
          {{ phase() === 'WAITING_FOR_ROLL' ? 'Roll the dice' : hint() }}
        </p>
        <p class="arena-turn-hint arena-turn-hint-compact">
          {{ phase() === 'WAITING_FOR_ROLL' ? 'Tap dice to roll' : hint() }}
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
