import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatchStatus, MatchSummaryDto } from '@ludo-game/shared-types';
import { ArenaApiService } from '../../../core/api/arena-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge';
import { formatDuration, httpErrorMessage, playerNames } from '../../../shared/format';

@Component({
  selector: 'ludo-lobby-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent],
  template: `
    <div class="mx-auto max-w-5xl px-4 py-8">
      <p class="text-xs uppercase tracking-[0.3em] text-arena-gold">Player lobby</p>
      <h1 class="mt-2 font-display text-3xl font-bold text-white">Your matches</h1>
      <p class="mt-2 text-sm text-arena-mist/70">
        Signed in as {{ auth.user()?.name }}. Reconnect anytime — identity is your account, not the socket.
      </p>

      @if (error()) {
        <p class="mt-4 text-piece-red">{{ error() }}</p>
      }

      <div class="mt-8 grid gap-4">
        @for (match of matches(); track match.id) {
          <article class="rounded-3xl border border-arena-line bg-arena-navy/80 p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wider text-arena-mist/50">
                  {{ match.tournamentName }} · {{ match.round }} · Match {{ match.matchNumber }}
                </p>
                <h2 class="mt-1 font-display text-xl text-white">{{ playerNames(match) }}</h2>
                @if (match.currentPlayerName) {
                  <p class="mt-1 text-sm text-arena-mist/70">Now playing: {{ match.currentPlayerName }}</p>
                }
              </div>
              <ludo-status-badge [status]="match.status" />
            </div>
            <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-arena-mist/70">
              <span>Duration {{ formatDuration(match.durationSeconds) }}</span>
              <a
                class="rounded-full bg-arena-gold px-4 py-2 font-display text-sm font-semibold text-arena-ink"
                [routerLink]="['/play', match.id]"
              >
                {{ cta(match) }}
              </a>
            </div>
          </article>
        } @empty {
          <p class="rounded-3xl border border-dashed border-arena-line p-8 text-arena-mist/60">
            No matches assigned yet. Ask an admin to register you in a tournament.
          </p>
        }
      </div>
    </div>
  `,
})
export class LobbyPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ArenaApiService);
  readonly matches = signal<MatchSummaryDto[]>([]);
  readonly error = signal<string | null>(null);
  readonly formatDuration = formatDuration;
  readonly playerNames = playerNames;

  async ngOnInit(): Promise<void> {
    try {
      this.matches.set(await this.api.myMatches());
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }

  cta(match: MatchSummaryDto): string {
    if (match.status === MatchStatus.LIVE || match.status === MatchStatus.PAUSED) {
      return 'Rejoin';
    }
    if (match.status === MatchStatus.COMPLETED) {
      return 'View result';
    }
    return 'Enter room';
  }
}
