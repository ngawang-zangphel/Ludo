import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatchStatus, MatchSummaryDto } from '@ludo-game/shared-types';
import { ArenaApiService } from '../../../core/api/arena-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge';
import { formatDuration, gameTypeLabel, httpErrorMessage, playerNames } from '../../../shared/format';

@Component({
  selector: 'ludo-lobby-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-8">
      <p class="text-xs uppercase tracking-[0.3em] text-arena-gold">Welcome, {{ auth.user()?.name }}</p>
      <h1 class="mt-2 font-display text-3xl font-bold text-white">Match invitations</h1>
      <p class="mt-2 text-sm text-arena-mist/70">
        When an admin seats you at a table, the invite shows up here. Join when you are ready.
      </p>

      @if (error()) {
        <p class="mt-4 text-piece-red">{{ error() }}</p>
      }

      <div class="mt-8 grid gap-4">
        @for (match of invitations(); track match.id) {
          <article class="rounded-3xl border border-arena-line bg-arena-navy/80 p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wider text-arena-mist/50">
                  {{ match.tournamentName }} · {{ roundLabel(match.round) }} · {{ gameTypeLabel(match.gameType) }}
                </p>
                <h2 class="mt-1 font-display text-xl text-white">{{ playerNames(match) }}</h2>
                <p class="mt-1 text-sm text-arena-mist/70">
                  You have been invited to this match.
                  @if (match.currentPlayerName) {
                    Now playing: {{ match.currentPlayerName }}.
                  }
                </p>
              </div>
              <ludo-status-badge [status]="match.status" />
            </div>
            <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-arena-mist/70">
              <span>{{ match.status === MatchStatus.WAITING || match.status === MatchStatus.READY ? 'Waiting to start' : 'Duration ' + formatDuration(match.durationSeconds) }}</span>
              <a
                class="rounded-full bg-arena-gold px-5 py-2 font-display text-sm font-semibold text-arena-ink"
                [routerLink]="['/play', match.id]"
              >
                {{ cta(match) }}
              </a>
            </div>
          </article>
        } @empty {
          <div class="rounded-3xl border border-dashed border-arena-line p-10 text-center">
            <p class="font-display text-lg text-white">No invitations yet</p>
            <p class="mt-2 text-sm text-arena-mist/60">
              Hang tight — an admin will invite you when a match is ready.
            </p>
            <a routerLink="/profile" class="mt-4 inline-block text-sm text-arena-gold hover:underline">Edit your profile</a>
          </div>
        }
      </div>
    </div>
  `,
})
export class LobbyPage implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly api = inject(ArenaApiService);
  readonly matches = signal<MatchSummaryDto[]>([]);
  readonly error = signal<string | null>(null);
  readonly formatDuration = formatDuration;
  readonly playerNames = playerNames;
  readonly gameTypeLabel = gameTypeLabel;
  readonly MatchStatus = MatchStatus;
  private poll: ReturnType<typeof setInterval> | undefined;

  readonly invitations = computed(() =>
    this.matches().filter(
      (match) =>
        match.status === MatchStatus.WAITING ||
        match.status === MatchStatus.READY ||
        match.status === MatchStatus.LIVE ||
        match.status === MatchStatus.PAUSED
    )
  );

  async ngOnInit(): Promise<void> {
    await this.refresh();
    this.poll = setInterval(() => void this.refresh(true), 8000);
  }

  ngOnDestroy(): void {
    if (this.poll) {
      clearInterval(this.poll);
    }
  }

  roundLabel(round: string): string {
    return round.replace(/_/g, ' ');
  }

  cta(match: MatchSummaryDto): string {
    if (match.status === MatchStatus.LIVE || match.status === MatchStatus.PAUSED) {
      return 'Rejoin match';
    }
    return 'Join match';
  }

  private async refresh(silent = false): Promise<void> {
    try {
      this.matches.set(await this.api.myMatches());
      if (!silent) {
        this.error.set(null);
      }
    } catch (error) {
      if (!silent) {
        this.error.set(httpErrorMessage(error));
      }
    }
  }
}
