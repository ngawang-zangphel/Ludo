import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SnakesPlayer } from '@ludo-game/shared-types';
import { PLAYER_SWATCH } from '../../models/theme';

@Component({
  selector: 'arena-snakes-player-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="rounded-3xl border p-4 shadow-lg backdrop-blur"
      [class.border-arena-gold]="active()"
      [class.bg-arena-panel/90]="true"
      [class.ring-2]="active()"
      [class.ring-arena-gold]="active()"
    >
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-arena-mist/50">{{ player().color }}</p>
          <h3 class="font-display text-lg font-semibold">{{ player().name }}</h3>
        </div>
        <span class="h-4 w-4 rounded-full ring-2 ring-white/20" [style.background]="PLAYER_SWATCH[player().color]"></span>
      </div>
      <p class="text-xs text-arena-mist/60">
        {{ player().connected ? 'Connected' : 'Reconnecting…' }}
        @if (player().finishedPosition) {
          · Finished {{ ordinal() }}
        }
      </p>
      <div class="mt-3 flex items-end justify-between gap-2">
        <p class="font-display text-3xl leading-none text-white">
          {{ player().position === 0 ? 'Start' : player().position }}
        </p>
        <p class="pb-1 text-xs text-arena-mist/45">/ 100</p>
      </div>
      <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30">
        <div
          class="h-full rounded-full transition-[width] duration-300"
          [style.width.%]="progress()"
          [style.background]="PLAYER_SWATCH[player().color]"
        ></div>
      </div>
    </section>
  `,
})
export class SnakesPlayerPanelComponent {
  readonly PLAYER_SWATCH = PLAYER_SWATCH;
  readonly player = input.required<SnakesPlayer>();
  readonly active = input(false);

  readonly progress = computed(() => Math.min(100, Math.max(0, this.player().position)));

  readonly ordinal = computed(() => {
    const place = this.player().finishedPosition;
    if (place === 1) return '1st';
    if (place === 2) return '2nd';
    if (place === 3) return '3rd';
    if (place === 4) return '4th';
    return '';
  });
}
