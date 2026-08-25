import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LudoPlayer } from '@ludo-game/shared-types';
import { PLAYER_SWATCH } from '../../models/theme';
import { PlayerYardComponent } from '../player-yard/player-yard';
import { HomePathComponent } from '../home-path/home-path';

@Component({
  selector: 'ludo-player-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlayerYardComponent, HomePathComponent],
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
        <span
          class="h-3 w-3 rounded-full"
          [style.background]="PLAYER_SWATCH[player().color]"
        ></span>
      </div>
      <p class="mb-1.5 text-[0.65rem] text-arena-mist/60">
        @if (player().eliminated) {
          Removed
        } @else {
          {{ player().connected ? 'Connected' : 'Reconnecting…' }}
          @if (player().finishedPosition) {
            · Finished {{ ordinal() }}
          }
        }
      </p>
      <ludo-home-path [player]="player()" />
      <div class="mt-1.5">
        <ludo-player-yard
          [player]="player()"
          [validPieceIds]="validPieceIds()"
          [hiddenPieceId]="hiddenPieceId()"
          (pieceSelect)="pieceSelect.emit($event)"
        />
      </div>
    </section>
  `,
})
export class PlayerPanelComponent {
  readonly PLAYER_SWATCH = PLAYER_SWATCH;
  readonly player = input.required<LudoPlayer>();
  readonly active = input(false);
  readonly validPieceIds = input<string[]>([]);
  readonly hiddenPieceId = input<string | null>(null);
  readonly pieceSelect = output<string>();

  readonly ordinal = computed(() => {
    const place = this.player().finishedPosition;
    if (place === 1) return '1st';
    if (place === 2) return '2nd';
    if (place === 3) return '3rd';
    if (place === 4) return '4th';
    return '';
  });
}
