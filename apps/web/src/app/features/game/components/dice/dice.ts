import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DICE_COUNTDOWN_MS } from '@ludo-game/shared-types';
import { DiceUiState } from '../../models/dice';

@Component({
  selector: 'ludo-dice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dice-shell" [class.is-compact]="compact()">
      <button
        type="button"
        class="dice-scene"
        [class.is-clickable]="canRoll()"
        [class.is-compact]="compact()"
        [class.is-ready]="canRoll() && state() !== 'ROLLING'"
        [class.is-rolling]="state() === 'ROLLING'"
        [class.is-result]="state() === 'RESULT'"
        [disabled]="!canRoll()"
        [attr.aria-label]="canRoll() ? 'Roll dice' : 'Dice'"
        (click)="requestRoll()"
      >
        <div class="dice-glow" aria-hidden="true"></div>
        <div class="dice-shadow" [class.is-rolling]="state() === 'ROLLING'"></div>
        <div class="dice-rig" [class.is-rolling]="state() === 'ROLLING'">
          <div
            class="dice-cube"
            [class.is-rolling]="state() === 'ROLLING'"
            [class.is-settled]="state() !== 'ROLLING'"
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
        @if (countdown(); as seconds) {
          <span class="dice-countdown" aria-live="polite">{{ seconds }}</span>
        }
      </button>
      @if (!compact() && state() === 'RESULT' && value(); as rolled) {
        <p class="dice-result-label" aria-live="polite">{{ rolled }}</p>
      }
      @if (!compact()) {
        <button
          type="button"
          class="dice-roll-btn"
          [class.is-ready]="canRoll() && state() !== 'ROLLING'"
          [disabled]="!canRoll()"
          (click)="requestRoll()"
        >
          {{ label() }}
        </button>
      }
    </div>
  `,
})
export class DiceComponent {
  private readonly destroyRef = inject(DestroyRef);
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private autoRolledForDeadline: string | null = null;

  readonly value = input<number | null>(null);
  readonly state = input<DiceUiState>('WAITING');
  readonly canRoll = input(false);
  /** Shared deadline from match state so every viewer sees the same countdown. */
  readonly rollDeadlineAt = input<string | null>(null);
  readonly compact = input(false);
  readonly roll = output<void>();
  readonly faces = DICE_FACES;
  readonly countdown = signal<number | null>(null);

  readonly settledFace = computed(() => {
    const value = this.value();
    if (this.state() === 'ROLLING' || value == null || value < 1 || value > 6) {
      return 1;
    }
    return value;
  });

  readonly label = computed(() => {
    const seconds = this.countdown();
    if (seconds != null) {
      return `Auto-roll in ${seconds}`;
    }
    if (this.state() === 'ROLLING') {
      return 'Rolling…';
    }
    if (this.state() === 'RESULT' && this.value() && !this.canRoll()) {
      return `Rolled ${this.value()}`;
    }
    return 'Roll dice';
  });

  constructor() {
    effect(() => {
      const deadline = this.rollDeadlineAt();
      const rolling = this.state() === 'ROLLING';
      this.clearTick();
      if (!deadline || rolling) {
        this.countdown.set(null);
        return;
      }
      this.syncCountdown(deadline);
      this.tickTimer = setInterval(() => this.syncCountdown(deadline), 250);
    });

    this.destroyRef.onDestroy(() => this.clearTick());
  }

  requestRoll(): void {
    if (!this.canRoll()) {
      return;
    }
    this.countdown.set(null);
    this.roll.emit();
  }

  private syncCountdown(deadline: string): void {
    const remainingMs = Date.parse(deadline) - Date.now();
    if (Number.isNaN(remainingMs)) {
      this.countdown.set(null);
      return;
    }

    if (remainingMs <= 0) {
      this.countdown.set(null);
      if (this.canRoll() && this.autoRolledForDeadline !== deadline) {
        this.autoRolledForDeadline = deadline;
        this.roll.emit();
      }
      return;
    }

    // Visible countdown only during the final DICE_COUNTDOWN_MS window.
    if (remainingMs > DICE_COUNTDOWN_MS) {
      this.countdown.set(null);
      return;
    }

    this.countdown.set(Math.max(1, Math.ceil(remainingMs / 1000)));
  }

  private clearTick(): void {
    if (this.tickTimer != null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }
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
