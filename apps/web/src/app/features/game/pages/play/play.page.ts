import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatchDetailDto, MatchStatus } from '@ludo-game/shared-types';
import { ArenaApiService } from '../../../../core/api/arena-api.service';
import { GameSocketService } from '../../services/game-socket.service';
import { GameTableComponent } from '../../components/game-table/game-table';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge';
import { httpErrorMessage } from '../../../../shared/format';

@Component({
  selector: 'ludo-play-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GameSocketService],
  imports: [RouterLink, GameTableComponent, StatusBadgeComponent],
  template: `
    <div class="px-4 py-6 lg:px-8">
      <div class="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div>
          <a routerLink="/" class="text-xs uppercase tracking-[0.3em] text-arena-gold hover:underline">Lobby</a>
          <h1 class="font-display text-3xl font-bold text-white">
            {{ detail()?.tournamentName || 'Match room' }}
          </h1>
          <p class="text-sm text-arena-mist/70">
            {{ detail()?.round }} · Match {{ detail()?.matchNumber }}
          </p>
        </div>
        @if (status(); as current) {
          <ludo-status-badge [status]="current" />
        }
      </div>

      @if (error()) {
        <p class="mx-auto max-w-7xl text-piece-red">{{ error() }}</p>
      }

      @if (game.state(); as state) {
        <ludo-game-table
          [state]="state"
          [displayCoords]="game.displayCoords()"
          [interactive]="canPlay()"
          [highlightValid]="canPlay()"
          [diceUi]="game.diceUi()"
          [canRoll]="game.canRoll()"
          [lastEvent]="game.lastEvent()"
          [errorMessage]="game.errorMessage()"
          (pieceSelect)="game.move($event)"
          (roll)="game.roll()"
        />
      } @else {
        <div class="mx-auto max-w-xl rounded-3xl border border-dashed border-arena-line p-10 text-center text-arena-mist/70">
          Waiting for the admin to start this match.
        </div>
      }

      @if (game.winner(); as winner) {
        <div class="pointer-events-none fixed inset-x-0 bottom-8 flex justify-center">
          <div class="rounded-full bg-arena-gold px-6 py-3 font-display text-lg font-semibold text-arena-ink shadow-2xl">
            {{ winner.name }} wins the arena
          </div>
        </div>
      }
    </div>
  `,
})
export class PlayPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ArenaApiService);
  readonly game = inject(GameSocketService);
  readonly detail = signal<MatchDetailDto | null>(null);
  readonly error = signal<string | null>(null);

  readonly status = computed(() => this.game.status() ?? this.detail()?.status ?? null);
  readonly canPlay = computed(() => !!this.game.me() && this.status() === MatchStatus.LIVE);

  async ngOnInit(): Promise<void> {
    const matchId = this.route.snapshot.paramMap.get('matchId');
    if (!matchId) {
      return;
    }
    try {
      this.detail.set(await this.api.match(matchId));
      this.game.attach(matchId, 'player');
      this.game.seed(this.detail()?.gameState ?? null);
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }

  ngOnDestroy(): void {
    this.game.detach();
  }
}
