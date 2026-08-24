import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BoardCell } from '@ludo-game/shared-types';
import { PLAYER_SWATCH, PLAYER_TRACK } from '../../models/theme';

@Component({
  selector: 'ludo-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative h-full w-full border border-black/20"
      [style.background]="background()"
    >
      @if (cell().kind === 'SAFE' || cell().kind === 'START') {
        <span class="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] text-black/50">★</span>
      }
      @if (cell().kind === 'CENTER') {
        <span class="absolute inset-2 rotate-45 rounded-sm bg-arena-gold/90"></span>
      }
    </div>
  `,
})
export class LudoCellComponent {
  readonly cell = input.required<BoardCell>();

  readonly background = computed(() => {
    const cell = this.cell();
    if (cell.kind === 'YARD' || cell.kind === 'YARD_SLOT') {
      return cell.color ? PLAYER_TRACK[cell.color] : '#172038';
    }
    if (cell.kind === 'HOME_PATH' || cell.kind === 'HOME_TRIANGLE' || cell.kind === 'START') {
      return cell.color ? PLAYER_SWATCH[cell.color] : '#f3efe4';
    }
    if (cell.kind === 'SAFE') {
      return '#efe6c9';
    }
    if (cell.kind === 'CENTER') {
      return '#10182b';
    }
    return '#f3efe4';
  });
}
