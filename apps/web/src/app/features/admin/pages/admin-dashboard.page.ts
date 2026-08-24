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
import { AdminRealtimeService } from '../../../core/socket/admin-realtime.service';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge';
import { formatDuration, httpErrorMessage, playerNames } from '../../../shared/format';

type Filter = 'ALL' | MatchStatus;

@Component({
  selector: 'ludo-admin-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent],
  template: `
    <div class="mx-auto max-w-6xl px-4 py-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-arena-gold">Control room</p>
          <h1 class="mt-2 font-display text-3xl font-bold text-white">Admin dashboard</h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <a
            routerLink="/admin/users"
            class="rounded-full border border-arena-gold px-4 py-2 text-sm text-arena-gold"
          >
            Users
          </a>
          <a
            routerLink="/admin/tournaments"
            class="rounded-full border border-arena-gold px-4 py-2 text-sm text-arena-gold"
          >
            Tournaments
          </a>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        @for (item of filters; track item) {
          <button
            type="button"
            class="rounded-full px-4 py-1.5 text-sm"
            [class.bg-arena-gold]="filter() === item"
            [class.text-arena-ink]="filter() === item"
            [class.border]="filter() !== item"
            [class.border-arena-line]="filter() !== item"
            (click)="filter.set(item)"
          >
            {{ labelFor(item) }}
          </button>
        }
      </div>

      @if (error()) {
        <p class="mt-4 text-piece-red">{{ error() }}</p>
      }

      <div class="mt-6 grid gap-4">
        @for (match of visible(); track match.id) {
          <article class="rounded-3xl border border-arena-line bg-arena-navy/80 p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wider text-arena-mist/50">
                  {{ match.tournamentName }} · {{ match.round }} · Match {{ match.matchNumber }}
                </p>
                <h2 class="mt-1 font-display text-xl text-white">{{ playerNames(match) }}</h2>
                <p class="mt-1 text-sm text-arena-mist/70">
                  @if (match.currentPlayerName) {
                    Turn: {{ match.currentPlayerName }} ·
                  }
                  Duration {{ formatDuration(match.durationSeconds) }}
                  @if (realtime.broadcastMatchId() === match.id) {
                    · <span class="text-arena-gold">On broadcast</span>
                  }
                </p>
              </div>
              <ludo-status-badge [status]="match.status" />
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <a class="btn-ghost" [routerLink]="['/admin/matches', match.id]">Watch</a>
              <button type="button" class="btn-ghost" (click)="run(() => api.broadcast(match.id))">
                Broadcast
              </button>
              @if (match.status === MatchStatus.READY || match.status === MatchStatus.WAITING) {
                <button type="button" class="btn-gold" (click)="run(() => api.start(match.id))">Start</button>
              }
              @if (match.status === MatchStatus.LIVE) {
                <button type="button" class="btn-ghost" (click)="run(() => api.pause(match.id))">Pause</button>
              }
              @if (match.status === MatchStatus.PAUSED) {
                <button type="button" class="btn-gold" (click)="run(() => api.resume(match.id))">Resume</button>
              }
              @if (match.status === MatchStatus.LIVE || match.status === MatchStatus.PAUSED || match.status === MatchStatus.COMPLETED) {
                <button type="button" class="btn-ghost" (click)="run(() => api.restart(match.id))">Restart</button>
              }
              @if (match.status !== MatchStatus.COMPLETED && match.status !== MatchStatus.CANCELLED) {
                <button type="button" class="btn-danger" (click)="run(() => api.cancel(match.id))">Cancel</button>
              }
              <button type="button" class="btn-danger" (click)="remove(match)">Delete</button>
            </div>
          </article>
        } @empty {
          <p class="rounded-3xl border border-dashed border-arena-line p-8 text-arena-mist/60">
            No matches in this filter.
          </p>
        }
      </div>
    </div>
  `,
  styles: `
    .btn-ghost {
      border-radius: 999px;
      border: 1px solid var(--color-arena-line);
      padding: 0.4rem 0.9rem;
      font-size: 0.85rem;
    }
    .btn-gold {
      border-radius: 999px;
      background: var(--color-arena-gold);
      color: var(--color-arena-ink);
      padding: 0.4rem 0.9rem;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .btn-danger {
      border-radius: 999px;
      border: 1px solid var(--color-piece-red);
      color: var(--color-piece-red);
      padding: 0.4rem 0.9rem;
      font-size: 0.85rem;
    }
  `,
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  readonly api = inject(ArenaApiService);
  readonly realtime = inject(AdminRealtimeService);
  readonly MatchStatus = MatchStatus;
  readonly filters: Filter[] = [
    'ALL',
    MatchStatus.LIVE,
    MatchStatus.WAITING,
    MatchStatus.READY,
    MatchStatus.PAUSED,
    MatchStatus.COMPLETED,
  ];
  readonly filter = signal<Filter>('ALL');
  readonly error = signal<string | null>(null);
  readonly formatDuration = formatDuration;
  readonly playerNames = playerNames;

  readonly visible = computed(() => {
    const filter = this.filter();
    const matches = this.realtime.matches();
    if (filter === 'ALL') {
      return matches;
    }
    return matches.filter((match) => match.status === filter);
  });

  async ngOnInit(): Promise<void> {
    try {
      const [matches, broadcast] = await Promise.all([this.api.matches(), this.api.currentBroadcast()]);
      this.realtime.matches.set(matches);
      this.realtime.broadcastMatchId.set(broadcast.matchId);
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
    this.realtime.subscribe();
  }

  ngOnDestroy(): void {
    this.realtime.unsubscribe();
  }

  labelFor(item: Filter): string {
    return String(item).replace(/_/g, ' ');
  }

  async run(action: () => Promise<unknown>): Promise<void> {
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }

  async remove(match: MatchSummaryDto): Promise<void> {
    if (!window.confirm(`Delete match ${match.matchNumber}? This cannot be undone.`)) {
      return;
    }
    await this.run(async () => {
      await this.api.deleteMatch(match.id);
      this.realtime.matches.update((matches) => matches.filter((item) => item.id !== match.id));
      if (this.realtime.broadcastMatchId() === match.id) {
        this.realtime.broadcastMatchId.set(null);
      }
    });
  }
}
