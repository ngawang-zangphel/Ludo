import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatchDetailDto, MatchStatus } from '@ludo-game/shared-types';
import { ArenaApiService, MatchNeighbors } from '../../../../core/api/arena-api.service';
import { AdminRealtimeService } from '../../../../core/socket/admin-realtime.service';
import { GameSocketService } from '../../services/game-socket.service';
import { GameTableComponent } from '../../components/game-table/game-table';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge';
import { httpErrorMessage } from '../../../../shared/format';

@Component({
  selector: 'ludo-spectator-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GameSocketService],
  imports: [RouterLink, GameTableComponent, StatusBadgeComponent],
  template: `
    <div class="px-4 py-6 lg:px-8">
      <div class="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div>
          <a routerLink="/admin" class="text-xs uppercase tracking-[0.3em] text-arena-gold hover:underline">Admin</a>
          <h1 class="font-display text-3xl font-bold text-white">Spectator</h1>
          <p class="text-sm text-arena-mist/70">
            {{ detail()?.tournamentName }} · {{ detail()?.round }} · Match {{ detail()?.matchNumber }}
            @if (neighbors(); as nav) {
              · Live {{ nav.index }} / {{ nav.total }}
            }
            @if (onBroadcast()) {
              · <span class="text-arena-gold">On broadcast</span>
            }
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          @if (detail(); as match) {
            <ludo-status-badge [status]="match.status" />
            @if (onBroadcast()) {
              <button
                type="button"
                class="rounded-full border border-piece-red px-4 py-2 text-sm text-piece-red"
                (click)="stopBroadcast()"
              >
                Stop broadcast
              </button>
            } @else {
              <button
                type="button"
                class="rounded-full border border-arena-gold px-4 py-2 text-sm text-arena-gold"
                (click)="broadcast(match.id)"
              >
                Broadcast this match
              </button>
            }
          }
          <button
            type="button"
            class="rounded-full border border-arena-line px-4 py-2 text-sm disabled:opacity-40"
            [disabled]="!neighbors()?.previousId"
            (click)="go(neighbors()?.previousId)"
          >
            Previous live
          </button>
          <button
            type="button"
            class="rounded-full border border-arena-line px-4 py-2 text-sm disabled:opacity-40"
            [disabled]="!neighbors()?.nextId"
            (click)="go(neighbors()?.nextId)"
          >
            Next live
          </button>
        </div>
      </div>

      @if (error()) {
        <p class="mx-auto max-w-7xl text-piece-red">{{ error() }}</p>
      }

      @if (seats().length) {
        <div class="mx-auto mb-4 flex max-w-7xl flex-wrap gap-2">
          @for (player of seats(); track player.userId) {
            <span class="inline-flex items-center gap-2 rounded-full border border-arena-line px-3 py-1 text-xs">
              {{ player.name }}
              @if (player.eliminated) {
                <span class="text-piece-red">Removed</span>
              } @else if (!game.state()) {
                <span [class.text-arena-gold]="player.ready" [class.text-arena-mist/50]="!player.ready">
                  {{ player.ready ? 'Ready' : 'Waiting' }}
                </span>
              }
              @if (canRemove() && !player.eliminated) {
                <button
                  type="button"
                  class="text-piece-red hover:underline"
                  (click)="removePlayer(player.userId)"
                >
                  Remove
                </button>
              }
            </span>
          }
        </div>
      }

      @if (game.state(); as state) {
        <ludo-game-table
          [state]="state"
          [displayCoords]="game.displayCoords()"
          [interactive]="false"
          [highlightValid]="true"
          [movingPieceId]="game.movingPieceId()"
          [hopTick]="game.hopTick()"
          [diceUi]="game.diceUi()"
          [canRoll]="false"
          [lastEvent]="game.lastEvent()"
          [errorMessage]="game.errorMessage()"
        />
      } @else {
        <div class="mx-auto max-w-xl rounded-3xl border border-dashed border-arena-line p-10 text-center text-arena-mist/70">
          This match has not started yet.
          <p class="mt-2 text-sm">Players must join from their invite before you can start from the dashboard.</p>
        </div>
      }
    </div>
  `,
})
export class SpectatorPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ArenaApiService);
  private readonly adminRt = inject(AdminRealtimeService);
  readonly game = inject(GameSocketService);
  readonly detail = signal<MatchDetailDto | null>(null);
  readonly neighbors = signal<MatchNeighbors | null>(null);
  readonly error = signal<string | null>(null);

  readonly onBroadcast = computed(
    () => !!this.detail() && this.adminRt.broadcastMatchId() === this.detail()?.id
  );

  readonly seats = computed(() => {
    const roster = this.game.roster();
    const state = this.game.state();
    const source = roster.length ? roster : (this.detail()?.players ?? []);
    return source.map((player) => ({
      ...player,
      eliminated:
        player.eliminated === true ||
        state?.players.find((entry) => entry.id === player.userId)?.eliminated === true,
    }));
  });

  readonly canRemove = computed(() => {
    const status = this.game.status() ?? this.detail()?.status;
    return status !== MatchStatus.COMPLETED && status !== MatchStatus.CANCELLED;
  });

  ngOnInit(): void {
    this.adminRt.subscribe();
    this.route.paramMap.subscribe((params) => {
      const matchId = params.get('matchId');
      if (matchId) {
        void this.load(matchId);
      }
    });
  }

  ngOnDestroy(): void {
    this.game.detach();
  }

  async broadcast(matchId: string): Promise<void> {
    try {
      const result = await this.api.broadcast(matchId);
      this.adminRt.broadcastMatchId.set(result.matchId);
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }

  async stopBroadcast(): Promise<void> {
    try {
      await this.api.stopBroadcast();
      this.adminRt.broadcastMatchId.set(null);
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }

  async removePlayer(userId: string): Promise<void> {
    const match = this.detail();
    const seat = this.seats().find((player) => player.userId === userId);
    if (!match) {
      return;
    }
    const live = match.status === MatchStatus.LIVE || match.status === MatchStatus.PAUSED || !!this.game.state();
    const message = live
      ? `Remove ${seat?.name ?? 'this player'} from this match? They will be out of the game.`
      : `Remove ${seat?.name ?? 'this player'} from this table?`;
    if (!window.confirm(message)) {
      return;
    }
    try {
      const detail = await this.api.removePlayer(match.id, userId);
      this.detail.set(detail);
      this.game.seed(detail.gameState);
      this.game.seedRoster(detail.players);
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }

  go(matchId: string | null | undefined): void {
    if (matchId) {
      void this.router.navigate(['/admin/matches', matchId]);
    }
  }

  private async load(matchId: string): Promise<void> {
    this.error.set(null);
    try {
      const [detail, neighbors, broadcast] = await Promise.all([
        this.api.match(matchId),
        this.api.neighbors(matchId),
        this.api.currentBroadcast(),
      ]);
      this.detail.set(detail);
      this.neighbors.set(neighbors);
      this.adminRt.broadcastMatchId.set(broadcast.matchId);
      this.game.attach(matchId, 'spectator');
      this.game.seed(detail.gameState);
      this.game.seedRoster(detail.players);
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }
}
