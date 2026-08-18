import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DiceUiState } from '../../models/dice';

@Component({
  selector: 'ludo-dice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-3">
      <div
        class="dice-face grid grid-cols-3 grid-rows-3 place-items-center p-3"
        [class.is-rolling]="state() === 'ROLLING'"
      >
        @for (pip of pips(); track $index) {
          <span
            class="h-2.5 w-2.5 rounded-full"
            [class.bg-arena-ink]="pip"
            [class.bg-transparent]="!pip"
          ></span>
        }
      </div>
      <button
        type="button"
        class="rounded-full bg-arena-gold px-6 py-2 font-display text-sm font-semibold text-arena-ink disabled:cursor-not-allowed disabled:opacity-40"
        [disabled]="!canRoll()"
        (click)="roll.emit()"
      >
        {{ label() }}
      </button>
    </div>
  `,
})
export class DiceComponent {
  readonly value = input<number | null>(null);
  readonly state = input<DiceUiState>('WAITING');
  readonly canRoll = input(false);
  readonly roll = output<void>();

  readonly label = computed(() => {
    if (this.state() === 'ROLLING') {
      return 'Rolling…';
    }
    if (this.state() === 'RESULT' && this.value()) {
      return `Rolled ${this.value()}`;
    }
    return 'Roll dice';
  });

  readonly pips = computed(() => {
    const display = this.state() === 'ROLLING' ? 5 : this.value() ?? 1;
    return PIP_MAP[display] ?? PIP_MAP[1];
  });
}

const PIP_MAP: Record<number, boolean[]> = {
  1: [false, false, false, false, true, false, false, false, false],
  2: [true, false, false, false, false, false, false, false, true],
  3: [true, false, false, false, true, false, false, false, true],
  4: [true, false, true, false, false, false, true, false, true],
  5: [true, false, true, false, true, false, true, false, true],
  6: [true, false, true, true, false, true, true, false, true],
};
