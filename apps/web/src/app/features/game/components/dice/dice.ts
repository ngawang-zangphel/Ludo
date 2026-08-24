import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DiceUiState } from '../../models/dice';

@Component({
  selector: 'ludo-dice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-3">
      <div class="dice-scene">
        <div class="dice-shadow" [class.is-rolling]="state() === 'ROLLING'"></div>
        <div class="dice-rig">
          <div
            class="dice-cube"
            [class.is-rolling]="state() === 'ROLLING'"
            [attr.data-face]="settledFace()"
          >
            @for (face of faces; track face.value) {
              <div class="dice-face" [attr.data-face]="face.value">
                @for (pip of face.pips; track $index) {
                  <span class="dice-pip" [class.is-on]="pip"></span>
                }
              </div>
            }
          </div>
        </div>
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
  readonly faces = DICE_FACES;

  readonly settledFace = computed(() => {
    const value = this.value();
    if (this.state() === 'ROLLING' || value == null || value < 1 || value > 6) {
      return 1;
    }
    return value;
  });

  readonly label = computed(() => {
    if (this.state() === 'ROLLING') {
      return 'Rolling…';
    }
    if (this.state() === 'RESULT' && this.value()) {
      return `Rolled ${this.value()}`;
    }
    return 'Roll dice';
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

const DICE_FACES = [1, 2, 3, 4, 5, 6].map((value) => ({
  value,
  pips: PIP_MAP[value] ?? PIP_MAP[1],
}));
