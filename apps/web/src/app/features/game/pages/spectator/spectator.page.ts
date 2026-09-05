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
import { MatchDetailDto, MatchStatus, isMarriageState, MarriageGameState } from '@ludo-game/shared-types';
import { ArenaApiService, MatchNeighbors } from '../../../../core/api/arena-api.service';
import { AdminRealtimeService } from '../../../../core/socket/admin-realtime.service';
import { GameSocketService } from '../../services/game-socket.service';
import { GameTableComponent } from '../../components/game-table/game-table';
import { MarriageTableComponent } from '../../components/marriage-table/marriage-table';
import { MatchStartOverlayComponent } from '../../components/match-start-overlay/match-start-overlay';
import { FinishCelebrationComponent } from '../../components/finish-celebration/finish-celebration';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge';
import { httpErrorMessage } from '../../../../shared/format';

@Component({
  selector: 'ludo-spectator-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GameSocketService],
  imports: [
    RouterLink,
    GameTableComponent,
    MarriageTableComponent,
    MatchStartOverlayComponent,
    FinishCelebrationComponent,
    StatusBadgeComponent,
  ],
  template: `
    <div class="px-3 py-2 lg:px-6">
      <arena-match-start-overlay
        [countdown]="game.startCountdown()"
        [dealing]="!!game.marriageDeal()"
      />
      <div class="mx-auto mb-2 flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <div>
          <a routerLink="/admin" class="text-[0.65rem] uppercase tracking-[0.3em] text-arena-gold hover:underline">Admin</a>
          <h1 class="font-display text-xl font-bold text-white md:text-2xl">Spectator</h1>
          <p class="text-xs text-arena-mist/70">
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
            <ludo-status-badge [status]="matchStatus() ?? match.status" />
            @if (onBroadcast()) {
              <button type="button" class="spec-btn spec-btn-danger" (click)="stopBroadcast()">
                Stop broadcast
              </button>
            } @else {
              <button type="button" class="spec-btn" (click)="broadcast(match.id)">Broadcast</button>
            }
            @if (matchStatus() === MatchStatus.READY || matchStatus() === MatchStatus.WAITING) {
              <button
                type="button"
                class="spec-btn spec-btn-gold disabled:cursor-not-allowed disabled:opacity-40"
                [disabled]="!canStart()"
                [title]="canStart() ? '' : 'Every seated player must join the match first'"
                (click)="startMatch()"
              >
                Start
              </button>
            }
            @if (matchStatus() === MatchStatus.LIVE) {
              <button type="button" class="spec-btn" (click)="pauseMatch()">Pause</button>
            }
            @if (matchStatus() === MatchStatus.PAUSED) {
              <button type="button" class="spec-btn spec-btn-gold" (click)="resumeMatch()">Resume</button>
            }
            @if (
              matchStatus() === MatchStatus.LIVE ||
              matchStatus() === MatchStatus.PAUSED ||
              matchStatus() === MatchStatus.COMPLETED
            ) {
              <button type="button" class="spec-btn" (click)="restartMatch()">Restart</button>
            }
            @if (matchStatus() !== MatchStatus.COMPLETED && matchStatus() !== MatchStatus.CANCELLED) {
              <button type="button" class="spec-btn spec-btn-danger" (click)="cancelMatch()">Cancel</button>
            }
            <button type="button" class="spec-btn spec-btn-danger" (click)="deleteMatch()">Delete</button>
          }
          <button
            type="button"
            class="spec-btn disabled:opacity-40"
            [disabled]="!neighbors()?.previousId"
            (click)="go(neighbors()?.previousId)"
          >
            Previous live
          </button>
          <button
            type="button"
            class="spec-btn disabled:opacity-40"
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
        <div class="mx-auto mb-2 flex max-w-7xl flex-wrap gap-1.5">
          @for (player of seats(); track player.userId) {
            <span class="inline-flex items-center gap-2 rounded-full border border-arena-line px-2.5 py-0.5 text-[0.7rem]">
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
        @if (asMarriage(state); as marriage) {
          <arena-marriage-table
            [state]="marriage"
            [interactive]="false"
            [viewerPlayerId]="null"
            [showAllHands]="true"
            [canOpen]="false"
            [canShow]="false"
            [selectedCardId]="null"
            [deal]="game.marriageDeal()"
          />
        } @else {
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
        }
        <arena-finish-celebration [celebration]="game.celebration()" />
      } @else {
        <div class="mx-auto max-w-xl rounded-3xl border border-dashed border-arena-line p-10 text-center text-arena-mist/70">
          This match has not started yet.
          <p class="mt-2 text-sm">Players must join from their invite before you can start.</p>
        </div>
      }
    </div>
  `,
  styles: `
    .spec-btn {
      border-radius: 999px;
      border: 1px solid var(--color-arena-line);
      padding: 0.35rem 0.8rem;
      font-size: 0.75rem;
      color: inherit;
      background: transparent;
    }
    .spec-btn-gold {
      border-color: transparent;
      background: var(--color-arena-gold);
      color: var(--color-arena-ink);
      font-weight: 600;
    }
    .spec-btn-danger {
      border-color: var(--color-piece-red);
      color: var(--color-piece-red);
    }
  `,
})
export class SpectatorPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ArenaApiService);
  private readonly adminRt = inject(AdminRealtimeService);
  readonly game = inject(GameSocketService);
  readonly MatchStatus = MatchStatus;
  readonly detail = signal<MatchDetailDto | null>(null);
  readonly neighbors = signal<MatchNeighbors | null>(null);
  readonly error = signal<string | null>(null);

  asMarriage(state: unknown): MarriageGameState | null {
    return state && typeof state === 'object' && isMarriageState(state as never)
      ? (state as MarriageGameState)
      : null;
  }

  readonly matchStatus = computed(() => this.game.status() ?? this.detail()?.status ?? null);

  readonly onBroadcast = computed(
    () => !!this.detail() && this.adminRt.broadcastMatchId() === this.detail()?.id
  );

  readonly canStart = computed(() => {
    const status = this.matchStatus();
    if (status !== MatchStatus.READY && status !== MatchStatus.WAITING) {
      return false;
    }
    const seats = this.seats();
    return seats.length >= 2 && seats.every((player) => player.ready);
  });

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

  async startMatch(): Promise<void> {
    const match = this.detail();
    if (!match || !this.canStart()) {
      return;
    }
    await this.runMatchAction(() => this.api.start(match.id));
  }

  async pauseMatch(): Promise<void> {
    const match = this.detail();
    if (!match) {
      return;
    }
    await this.runMatchAction(() => this.api.pause(match.id));
  }

  async resumeMatch(): Promise<void> {
    const match = this.detail();
    if (!match) {
      return;
    }
    await this.runMatchAction(() => this.api.resume(match.id));
  }

  async restartMatch(): Promise<void> {
    const match = this.detail();
    if (!match) {
      return;
    }
    if (!window.confirm(`Restart match ${match.matchNumber}? The current board will be reset.`)) {
      return;
    }
    await this.runMatchAction(() => this.api.restart(match.id));
  }

  async cancelMatch(): Promise<void> {
    const match = this.detail();
    if (!match) {
      return;
    }
    if (!window.confirm(`Cancel match ${match.matchNumber}?`)) {
      return;
    }
    await this.runMatchAction(() => this.api.cancel(match.id));
  }

  async deleteMatch(): Promise<void> {
    const match = this.detail();
    if (!match) {
      return;
    }
    if (!window.confirm(`Delete match ${match.matchNumber}? This cannot be undone.`)) {
      return;
    }
    this.error.set(null);
    try {
      await this.api.deleteMatch(match.id);
      if (this.adminRt.broadcastMatchId() === match.id) {
        this.adminRt.broadcastMatchId.set(null);
      }
      await this.router.navigate(['/admin']);
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }

  private async runMatchAction(action: () => Promise<MatchDetailDto>): Promise<void> {
    this.error.set(null);
    try {
      this.applyDetail(await action());
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }

  private applyDetail(detail: MatchDetailDto): void {
    this.detail.set(detail);
    this.game.seed(detail.gameState);
    this.game.seedRoster(detail.players);
    this.game.status.set(detail.status);
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
