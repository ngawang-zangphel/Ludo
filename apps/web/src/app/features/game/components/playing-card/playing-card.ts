import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MarriageCard, MarriageRank, MarriageSuit } from '@ludo-game/shared-types';

/**
 * Classic playing-card face (SVG). Built in-house — Vecteezy assets
 * (https://www.vecteezy.com/free-svg/playing-cards) need their own license
 * and aren't bundled here.
 */
@Component({
  selector: 'arena-playing-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative select-none overflow-hidden rounded-[0.45rem] border shadow-sm"
      [class.border-stone-300]="!highlight()"
      [class.border-arena-gold]="highlight()"
      [class.ring-2]="highlight()"
      [class.ring-arena-gold]="highlight()"
      [class.opacity-40]="dimmed()"
      [class.opacity-75]="muted() && !dimmed()"
      [style.width.px]="width()"
      [style.height.px]="height()"
      [style.background]="faceBg()"
    >
      <svg
        class="h-full w-full"
        [attr.viewBox]="'0 0 ' + viewW + ' ' + viewH"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <!-- Top-left index -->
        <text
          x="7"
          y="16"
          font-family="Georgia, 'Times New Roman', serif"
          font-size="13"
          font-weight="700"
          [attr.fill]="ink()"
        >
          {{ rankGlyph() }}
        </text>
        <g [attr.transform]="'translate(7 20) scale(0.55)'" [attr.fill]="ink()">
          <path [attr.d]="suitPath()" />
        </g>

        <!-- Bottom-right index -->
        <g [attr.transform]="'translate(' + viewW + ' ' + viewH + ') rotate(180)'">
          <text
            x="7"
            y="16"
            font-family="Georgia, 'Times New Roman', serif"
            font-size="13"
            font-weight="700"
            [attr.fill]="ink()"
          >
            {{ rankGlyph() }}
          </text>
          <g [attr.transform]="'translate(7 20) scale(0.55)'" [attr.fill]="ink()">
            <path [attr.d]="suitPath()" />
          </g>
        </g>

        <!-- Center pip / face letter -->
        @if (isFace()) {
          <text
            [attr.x]="viewW / 2"
            [attr.y]="viewH / 2 + 8"
            text-anchor="middle"
            font-family="Georgia, 'Times New Roman', serif"
            font-size="26"
            font-weight="700"
            [attr.fill]="ink()"
          >
            {{ rankGlyph() }}
          </text>
          <g
            [attr.transform]="'translate(' + (viewW / 2 - 8) + ' ' + (viewH / 2 + 14) + ') scale(0.7)'"
            [attr.fill]="ink()"
          >
            <path [attr.d]="suitPath()" />
          </g>
        } @else {
          <g
            [attr.transform]="'translate(' + (viewW / 2 - 14) + ' ' + (viewH / 2 - 14) + ') scale(1.15)'"
            [attr.fill]="ink()"
          >
            <path [attr.d]="suitPath()" />
          </g>
        }
      </svg>

      @if (badge(); as tag) {
        <span
          class="pointer-events-none absolute inset-x-0 bottom-0 bg-amber-100/95 py-0.5 text-center text-[7px] font-bold uppercase tracking-wide text-amber-800"
        >
          {{ tag }}
        </span>
      }

      @if (caption(); as cap) {
        <span
          class="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[7px] font-semibold uppercase tracking-wide text-white"
        >
          {{ cap }}
        </span>
      }
    </div>
  `,
})
export class PlayingCardComponent {
  readonly viewW = 70;
  readonly viewH = 98;

  readonly card = input.required<MarriageCard>();
  readonly width = input(48);
  readonly height = input(68);
  readonly highlight = input(false);
  readonly dimmed = input(false);
  readonly muted = input(false);
  readonly badge = input<string | null>(null);
  readonly caption = input<string | null>(null);

  readonly ink = computed(() => (this.isRed() ? '#c41e3a' : '#1a1a1a'));
  readonly faceBg = computed(() =>
    this.highlight()
      ? 'linear-gradient(160deg, #fffef8 0%, #fff7d6 100%)'
      : 'linear-gradient(160deg, #ffffff 0%, #f3f0ea 100%)'
  );

  isRed(): boolean {
    const suit = this.card().suit;
    return suit === 'H' || suit === 'D';
  }

  isFace(): boolean {
    const rank = this.card().rank;
    return rank === 'J' || rank === 'Q' || rank === 'K' || rank === 'A';
  }

  rankGlyph(): string {
    return RANK_GLYPH[this.card().rank];
  }

  suitPath(): string {
    return SUIT_PATH[this.card().suit];
  }
}

/** Classic suit silhouettes in a ~24×24 box. */
const SUIT_PATH: Record<MarriageSuit, string> = {
  S: 'M12 2 C12 2 4 11 4 15.5 C4 19 7 21 10 21 C10 21 9.5 23 8 23 L16 23 C14.5 23 14 21 14 21 C17 21 20 19 20 15.5 C20 11 12 2 12 2 Z',
  H: 'M12 21 C12 21 2 13 2 8 C2 5 4 3 6.5 3 C9 3 11 5 12 7 C13 5 15 3 17.5 3 C20 3 22 5 22 8 C22 13 12 21 12 21 Z',
  D: 'M12 2 L20 12 L12 22 L4 12 Z',
  C: 'M12 10 C9 10 7 8 7 6 C7 4 9 2.5 11 3 C10 1.5 11 0 12 0 C13 0 14 1.5 13 3 C15 2.5 17 4 17 6 C17 8 15 10 12 10 C15 10 18 12 18 15 C18 17.5 15.5 19.5 12.5 19.5 C12.5 19.5 13 22 11 22 L13 22 C11 22 11.5 19.5 11.5 19.5 C8.5 19.5 6 17.5 6 15 C6 12 9 10 12 10 Z',
};

const RANK_GLYPH: Record<MarriageRank, string> = {
  A: 'A',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
};
