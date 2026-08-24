import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PlayerColor } from '@ludo-game/shared-types';
import { PIECE_PAINT } from '../../models/theme';

@Component({
  selector: 'ludo-piece',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full w-full' },
  template: `
    <button
      type="button"
      class="piece-token"
      [class.is-valid]="highlighted()"
      [class.is-clickable]="selectable()"
      (click)="onClick()"
      [attr.aria-label]="label()"
      [attr.aria-disabled]="!selectable()"
    >
      <svg viewBox="0 0 80 100" class="h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient [attr.id]="ids().head" cx="35%" cy="28%" r="70%">
            <stop offset="0%" [attr.stop-color]="paint().light" />
            <stop offset="55%" [attr.stop-color]="paint().mid" />
            <stop offset="100%" [attr.stop-color]="paint().deep" />
          </radialGradient>
          <linearGradient [attr.id]="ids().stem" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" [attr.stop-color]="paint().shade" />
            <stop offset="28%" [attr.stop-color]="paint().mid" />
            <stop offset="52%" [attr.stop-color]="paint().light" />
            <stop offset="78%" [attr.stop-color]="paint().mid" />
            <stop offset="100%" [attr.stop-color]="paint().shade" />
          </linearGradient>
          <linearGradient [attr.id]="ids().base" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" [attr.stop-color]="paint().light" />
            <stop offset="45%" [attr.stop-color]="paint().mid" />
            <stop offset="100%" [attr.stop-color]="paint().shade" />
          </linearGradient>
          <radialGradient [attr.id]="ids().rim" cx="50%" cy="35%" r="70%">
            <stop offset="0%" [attr.stop-color]="paint().light" />
            <stop offset="70%" [attr.stop-color]="paint().deep" />
            <stop offset="100%" [attr.stop-color]="paint().shade" />
          </radialGradient>
        </defs>

        <ellipse cx="40" cy="93" rx="22" ry="5.5" fill="#000" opacity="0.38" />
        <ellipse cx="40" cy="84" rx="21" ry="8" [attr.fill]="'url(#' + ids().rim + ')'" />
        <ellipse cx="40" cy="80" rx="17.5" ry="6.2" [attr.fill]="'url(#' + ids().base + ')'" />
        <ellipse cx="40" cy="78.2" rx="13" ry="3.4" fill="#fff" opacity="0.18" />

        <path
          d="M29 78 C30 58 33 46 36 42 C40 38 40 38 44 42 C47 46 50 58 51 78 Z"
          [attr.fill]="'url(#' + ids().stem + ')'"
        />
        <path d="M37 44 C38.5 54 39 66 39.5 78" stroke="#fff" stroke-width="1.4" opacity="0.22" fill="none" />

        <ellipse cx="40" cy="43" rx="11" ry="4.6" [attr.fill]="paint().deep" />
        <ellipse cx="40" cy="41.6" rx="10" ry="3.6" [attr.fill]="'url(#' + ids().base + ')'" />

        <circle cx="40" cy="27" r="16.5" [attr.fill]="'url(#' + ids().head + ')'" />
        <ellipse cx="33" cy="21" rx="7.5" ry="5" fill="#fff" opacity="0.42" />
        <circle cx="35" cy="19" r="2.1" fill="#fff" opacity="0.75" />
        <path
          d="M28 33 Q40 39 52 33"
          fill="none"
          [attr.stroke]="paint().shade"
          stroke-width="1.4"
          opacity="0.28"
        />
      </svg>
    </button>
  `,
})
export class LudoPieceComponent {
  readonly pieceId = input.required<string>();
  readonly color = input.required<PlayerColor>();
  readonly highlighted = input(false);
  readonly selectable = input(false);
  readonly label = input('Piece');
  readonly pieceSelect = output<string>();

  readonly paint = computed(() => PIECE_PAINT[this.color()]);
  readonly ids = computed(() => {
    const key = this.pieceId().replace(/[^a-zA-Z0-9_-]/g, '');
    return {
      head: `pawn-head-${key}`,
      stem: `pawn-stem-${key}`,
      base: `pawn-base-${key}`,
      rim: `pawn-rim-${key}`,
    };
  });

  onClick(): void {
    if (this.selectable()) {
      this.pieceSelect.emit(this.pieceId());
    }
  }
}
