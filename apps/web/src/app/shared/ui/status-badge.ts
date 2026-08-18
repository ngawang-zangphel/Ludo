import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatchStatus, TournamentStatus } from '@ludo-game/shared-types';

@Component({
  selector: 'ludo-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider" [class]="tone()">
      {{ label() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<MatchStatus | TournamentStatus | string>();

  readonly label = computed(() => String(this.status()).replace(/_/g, ' '));

  readonly tone = computed(() => {
    switch (this.status()) {
      case MatchStatus.LIVE:
      case TournamentStatus.LIVE:
        return 'bg-piece-green/20 text-piece-green';
      case MatchStatus.PAUSED:
        return 'bg-piece-yellow/20 text-piece-yellow';
      case MatchStatus.READY:
      case TournamentStatus.REGISTRATION:
        return 'bg-piece-blue/20 text-piece-blue';
      case MatchStatus.COMPLETED:
      case TournamentStatus.COMPLETED:
        return 'bg-arena-gold/20 text-arena-gold';
      case MatchStatus.CANCELLED:
      case TournamentStatus.CANCELLED:
        return 'bg-piece-red/20 text-piece-red';
      default:
        return 'bg-white/10 text-arena-mist/80';
    }
  });
}
