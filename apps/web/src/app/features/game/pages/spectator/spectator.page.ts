import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatchDetailDto } from '@ludo-game/shared-types';
import { ArenaApiService, MatchNeighbors } from '../../../../core/api/arena-api.service';
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
              · {{ nav.index }} / {{ nav.total }}
            }
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          @if (detail(); as match) {
            <ludo-status-badge [status]="match.status" />
            <button
              type="button"
              class="rounded-full border border-arena-gold px-4 py-2 text-sm text-arena-gold"
              (click)="broadcast(match.id)"
            >
              Broadcast this match
            </button>
          }
          <button
            type="button"
            class="rounded-full border border-arena-line px-4 py-2 text-sm disabled:opacity-40"
            [disabled]="!neighbors()?.previousId"
            (click)="go(neighbors()?.previousId)"
          >
            Previous
          </button>
          <button
            type="button"
            class="rounded-full border border-arena-line px-4 py-2 text-sm disabled:opacity-40"
            [disabled]="!neighbors()?.nextId"
            (click)="go(neighbors()?.nextId)"
          >
            Next
          </button>
        </div>
      </div>

      @if (error()) {
        <p class="mx-auto max-w-7xl text-piece-red">{{ error() }}</p>
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
        </div>
      }
    </div>
  `,
})
export class SpectatorPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ArenaApiService);
  readonly game = inject(GameSocketService);
  readonly detail = signal<MatchDetailDto | null>(null);
  readonly neighbors = signal<MatchNeighbors | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
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
      await this.api.broadcast(matchId);
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
      const [detail, neighbors] = await Promise.all([this.api.match(matchId), this.api.neighbors(matchId)]);
      this.detail.set(detail);
      this.neighbors.set(neighbors);
      this.game.attach(matchId, 'spectator');
      this.game.seed(detail.gameState);
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }
}
