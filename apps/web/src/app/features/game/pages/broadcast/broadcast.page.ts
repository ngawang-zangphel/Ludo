import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isMarriageState, isSnakesState, MarriageGameState, MatchStatus } from '@ludo-game/shared-types';
import { GameSocketService } from '../../services/game-socket.service';
import { ArenaApiService } from '../../../../core/api/arena-api.service';
import { GameTableComponent } from '../../components/game-table/game-table';
import { MarriageTableComponent } from '../../components/marriage-table/marriage-table';
import { MatchStartOverlayComponent } from '../../components/match-start-overlay/match-start-overlay';
import { FinishCelebrationComponent } from '../../components/finish-celebration/finish-celebration';
import { AuthService } from '../../../../core/auth/auth.service';
import { placeLabel } from '../../../../shared/format';
import { readSnakesView3d } from '../../models/snakes-view';

@Component({
  selector: 'ludo-broadcast-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GameSocketService],
  host: { class: 'broadcast-screen' },
  imports: [
    GameTableComponent,
    MarriageTableComponent,
    MatchStartOverlayComponent,
    FinishCelebrationComponent,
    RouterLink,
  ],
  template: `
    <div class="min-h-screen px-6 py-8">
      <arena-match-start-overlay
        [countdown]="game.startCountdown()"
        [dealing]="!!game.marriageDeal()"
      />
      <div class="mx-auto mb-6 max-w-7xl text-center">
        <p class="text-xs uppercase tracking-[0.4em] text-arena-gold">Arena · Live broadcast</p>
        <h1 class="mt-2 font-display text-4xl font-bold text-white md:text-5xl">Projector</h1>
      </div>

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
            [state]="game.tableState() ?? state"
            [displayCoords]="game.displayCoords()"
            [interactive]="false"
            [highlightValid]="true"
            [movingPieceId]="game.movingPieceId()"
            [hopTick]="game.hopTick()"
            [diceUi]="game.diceUi()"
            [canRoll]="false"
            [lastEvent]="game.tableLastEvent()"
            [view3d]="isSnakes(state) && view3d"
          />
        }
      } @else {
        <div class="mx-auto mt-24 max-w-xl rounded-3xl border border-dashed border-arena-line p-12 text-center">
          <p class="font-display text-2xl text-white">Standing by</p>
          <p class="mt-2 text-arena-mist/70">{{ message() }}</p>
          @if (!auth.user()) {
            <a routerLink="/login" class="mt-6 inline-block text-sm text-arena-gold hover:underline">Sign in</a>
          }
        </div>
      }

      <arena-finish-celebration [celebration]="game.celebration()" />

      @if (game.status() === MatchStatus.COMPLETED && game.placements(); as places) {
        @if (places.length) {
          <div class="pointer-events-none fixed inset-x-0 bottom-10 flex justify-center px-4">
            <div class="max-w-lg rounded-3xl border border-arena-gold/40 bg-arena-navy/95 px-8 py-5 shadow-2xl">
              <p class="text-center text-xs uppercase tracking-[0.28em] text-arena-gold/80">Standings</p>
              <ol class="mt-3 space-y-1.5">
                @for (place of places; track place.place) {
                  <li class="flex items-baseline justify-center gap-4 font-display text-2xl text-white">
                    <span class="text-arena-gold">{{ placeLabel(place.place) }}</span>
                    <span>{{ place.name }}</span>
                  </li>
                }
              </ol>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class BroadcastPage implements OnInit, OnDestroy {
  private readonly api = inject(ArenaApiService);
  readonly auth = inject(AuthService);
  readonly game = inject(GameSocketService);
  readonly message = signal('Waiting for an admin to select a match.');
  readonly MatchStatus = MatchStatus;
  readonly placeLabel = placeLabel;
  readonly view3d = readSnakesView3d();

  isSnakes(state: unknown): boolean {
    return !!state && typeof state === 'object' && isSnakesState(state as never);
  }

  asMarriage(state: unknown): MarriageGameState | null {
    return state && typeof state === 'object' && isMarriageState(state as never)
      ? (state as MarriageGameState)
      : null;
  }

  async ngOnInit(): Promise<void> {
    try {
      const current = await this.api.currentBroadcast();
      this.game.attach(current.matchId, 'broadcast');
      this.game.seed(current.match?.gameState ?? null);
      if (!current.matchId) {
        this.message.set('Waiting for an admin to select a match.');
      }
    } catch {
      this.game.attach(null, 'broadcast');
      this.message.set('Could not load the current broadcast. Reconnecting…');
    }
  }

  ngOnDestroy(): void {
    this.game.detach();
  }
}
