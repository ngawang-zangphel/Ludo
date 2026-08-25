import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'arena-match-start-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (countdown(); as n) {
      <div
        class="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-arena-ink/55 backdrop-blur-[2px]"
        aria-live="assertive"
      >
        <div class="relative flex h-40 w-40 items-center justify-center">
          <span
            class="absolute inset-0 rounded-full border-2 border-arena-gold/40"
            style="animation: match-start-ring 1s ease-out infinite"
          ></span>
          @for (value of frame(); track value) {
            <span
              class="font-display text-8xl font-bold text-white drop-shadow-lg md:text-9xl"
              style="animation: match-start-pop 1s ease-out"
            >
              {{ value }}
            </span>
          }
        </div>
      </div>
    }
    @if (dealing()) {
      <div
        class="pointer-events-none fixed inset-x-0 top-8 z-[70] flex justify-center"
        aria-live="polite"
      >
        <p
          class="rounded-full border border-arena-gold/40 bg-arena-navy/90 px-5 py-2 text-xs uppercase tracking-[0.25em] text-arena-gold shadow-lg"
        >
          Dealing cards
        </p>
      </div>
    }
  `,
  styles: `
    @keyframes match-start-pop {
      0% {
        transform: scale(0.55);
        opacity: 0.35;
      }
      35% {
        transform: scale(1.12);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    @keyframes match-start-ring {
      0% {
        transform: scale(0.7);
        opacity: 0.8;
      }
      100% {
        transform: scale(1.35);
        opacity: 0;
      }
    }
  `,
})
export class MatchStartOverlayComponent {
  readonly countdown = input<number | null>(null);
  readonly dealing = input(false);

  readonly frame = computed(() => {
    const n = this.countdown();
    return n == null ? [] : [n];
  });
}
