import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LudoPlayer } from '@ludo-game/shared-types';
import { PLAYER_SWATCH } from '../../models/theme';
import { DiceUiState } from '../../models/dice';
import { DiceComponent } from '../dice/dice';

@Component({
  selector: 'ludo-player-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DiceComponent],
  host: { class: 'inline-flex' },
  template: `
    <section
      class="king-badge"
      [class.is-active]="active()"
      [class.is-end]="align() === 'end'"
      [class.opacity-50]="player().eliminated"
      [style.--seat-color]="PLAYER_SWATCH[player().color]"
    >
      <span class="king-pin" aria-hidden="true">
        <svg viewBox="0 0 32 42">
          <path
            fill="currentColor"
            d="M16 1.5c-7.2 0-13 5.7-13 12.7 0 9.3 13 26.3 13 26.3s13-17 13-26.3C29 7.2 23.2 1.5 16 1.5Z"
          />
          <circle cx="16" cy="14" r="5.2" fill="#fff" opacity="0.95" />
        </svg>
      </span>
      <div class="king-well" [class.is-live]="active()">
        @if (active() && !player().eliminated) {
          <ludo-dice
            [value]="diceValue()"
            [state]="diceUi()"
            [canRoll]="canRoll()"
            [rollDeadlineAt]="rollDeadlineAt()"
            [compact]="true"
            (roll)="roll.emit()"
          />
        }
      </div>
    </section>
  `,
})
export class PlayerPanelComponent {
  readonly PLAYER_SWATCH = PLAYER_SWATCH;
  readonly player = input.required<LudoPlayer>();
  readonly active = input(false);
  readonly align = input<'start' | 'end'>('start');
  readonly diceValue = input<number | null>(null);
  readonly diceUi = input<DiceUiState>('WAITING');
  readonly canRoll = input(false);
  readonly rollDeadlineAt = input<string | null>(null);
  readonly roll = output<void>();
}
