import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SnakesPlayer } from '@ludo-game/shared-types';
import { PLAYER_SWATCH } from '../../models/theme';

@Component({
  selector: 'arena-snakes-player-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <section
      class="king-badge snakes-badge"
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
      <div class="snakes-badge-copy">
        <p class="snakes-badge-name">{{ player().name }}</p>
        <p class="snakes-badge-meta">
          <span>{{ squareLabel() }}</span>
          @if (active() && !player().eliminated && !player().finishedPosition) {
            <span class="arena-seat-turn">Turn</span>
          }
        </p>
      </div>
    </section>
  `,
})
export class SnakesPlayerPanelComponent {
  readonly PLAYER_SWATCH = PLAYER_SWATCH;
  readonly player = input.required<SnakesPlayer>();
  readonly active = input(false);
  readonly align = input<'start' | 'end'>('start');

  readonly squareLabel = computed(() => {
    const player = this.player();
    if (player.finishedPosition) {
      if (player.finishedPosition === 1) return '1st';
      if (player.finishedPosition === 2) return '2nd';
      if (player.finishedPosition === 3) return '3rd';
      return `${player.finishedPosition}th`;
    }
    if (player.position <= 0) {
      return 'GO';
    }
    return String(player.position);
  });
}
