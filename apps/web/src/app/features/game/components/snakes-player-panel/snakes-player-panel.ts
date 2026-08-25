import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SnakesPlayer } from '@ludo-game/shared-types';
import { PLAYER_SWATCH } from '../../models/theme';

@Component({
  selector: 'arena-snakes-player-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="rounded-2xl border px-3 py-2.5 shadow-lg backdrop-blur"
      [class.border-arena-gold]="active()"
      [class.bg-arena-panel/90]="true"
      [class.ring-2]="active()"
      [class.ring-arena-gold]="active()"
      [class.opacity-50]="player().eliminated"
    >
      <div class="mb-1.5 flex items-center justify-between gap-2">
        <div>
          <p class="text-[0.65rem] uppercase tracking-[0.2em] text-arena-mist/50">{{ player().color }}</p>
          <h3 class="font-display text-sm font-semibold leading-tight">{{ player().name }}</h3>
        </div>
        <span class="h-3 w-3 rounded-full ring-2 ring-white/20" [style.background]="PLAYER_SWATCH[player().color]"></span>
      </div>
      <p class="text-[0.65rem] text-arena-mist/60">
        @if (player().eliminated) {
          Removed
        } @else {
          {{ player().connected ? 'Connected' : 'Reconnecting…' }}
          @if (player().finishedPosition) {
            · Finished {{ ordinal() }}
          }
        }
      </p>
      <div class="mt-1.5 flex items-end justify-between gap-2">
        <p class="font-display text-xl leading-none text-white">
          {{ player().position === 0 ? 'Start' : player().position }}
        </p>
        <p class="pb-0.5 text-[0.65rem] text-arena-mist/45">/ 100</p>
      </div>
      <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-black/30">
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
