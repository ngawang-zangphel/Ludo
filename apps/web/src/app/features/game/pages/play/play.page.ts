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
import {
  isMarriageState,
  MarriageGameState,
  MatchDetailDto,
  MatchStatus,
} from '@ludo-game/shared-types';
import { ArenaApiService } from '../../../../core/api/arena-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { GameSocketService } from '../../services/game-socket.service';
import { GameTableComponent } from '../../components/game-table/game-table';
import { MarriageTableComponent } from '../../components/marriage-table/marriage-table';
import { MatchStartOverlayComponent } from '../../components/match-start-overlay/match-start-overlay';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge';
import { httpErrorMessage } from '../../../../shared/format';

@Component({
  selector: 'ludo-play-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GameSocketService],
  imports: [
    RouterLink,
    GameTableComponent,
    MarriageTableComponent,
    MatchStartOverlayComponent,
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
          <a routerLink="/" class="text-[0.65rem] uppercase tracking-[0.3em] text-arena-gold hover:underline">Invitations</a>
          <h1 class="font-display text-xl font-bold text-white md:text-2xl">
            {{ detail()?.tournamentName || 'Match room' }}
          </h1>
          <p class="text-xs text-arena-mist/70">
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
        @if (asMarriage(state); as marriage) {
          <arena-marriage-table
            [state]="marriage"
            [interactive]="canPlay()"
            [viewerPlayerId]="auth.user()?.id ?? null"
            [canOpen]="game.marriageCanOpen()"
            [canShow]="game.marriageCanShowWin()"
            [selectedCardId]="game.selectedCardId()"
            [deal]="game.marriageDeal()"
            (drawStock)="game.marriageDraw('stock')"
            (drawDiscard)="game.marriageDraw('discard')"
            (open)="game.marriageOpen()"
            (show)="game.marriageShow()"
            (discard)="game.marriageDiscard($event)"
            (selectCard)="game.selectCard($event)"
            (reorder)="game.marriageReorder($event)"
            (extendMeld)="game.marriageExtendMeld($event.cardId, $event.meldIndex)"
            (joinMelds)="game.marriageJoinMelds($event.meldIndexA, $event.meldIndexB)"
            (meldCardRemove)="onMeldCardRemove($event)"
            (addMeld)="game.marriageAddMeld($event)"
            (layoutError)="game.flashError($event)"
          />
          @if (game.lastEvent(); as event) {
            <p class="mx-auto mt-3 max-w-5xl text-center text-xs text-arena-mist/60">{{ event }}</p>
          }
        } @else {
          <ludo-game-table
            [state]="state"
            [displayCoords]="game.displayCoords()"
            [interactive]="canPlay() && !game.animating()"
            [highlightValid]="canPlay()"
            [movingPieceId]="game.movingPieceId()"
            [hopTick]="game.hopTick()"
            [diceUi]="game.diceUi()"
            [canRoll]="game.canRoll()"
            [lastEvent]="game.lastEvent()"
            [errorMessage]="game.errorMessage()"
            (pieceSelect)="game.move($event)"
            (roll)="game.roll()"
          />
        }
      } @else if (removed()) {
        <div class="mx-auto max-w-xl rounded-3xl border border-dashed border-piece-red/40 p-10 text-center text-piece-red">
          You are not in this match.
        </div>
      } @else {
        <div class="mx-auto max-w-xl rounded-3xl border border-dashed border-arena-line p-10 text-center text-arena-mist/70">
          <p>Waiting for the admin to start this match.</p>
          <p class="mt-2 text-xs uppercase tracking-[0.2em] text-arena-gold">You are ready</p>
          <ul class="mt-6 space-y-2 text-left text-sm">
            @for (player of game.roster(); track player.userId) {
              <li class="flex items-center justify-between rounded-2xl border border-arena-line px-4 py-2">
                <span>{{ player.name }}</span>
                <span [class.text-arena-gold]="player.ready" [class.text-arena-mist/50]="!player.ready">
                  {{ player.ready ? 'Ready' : 'Waiting' }}
                </span>
              </li>
            }
          </ul>
        </div>
      }

      @if (game.errorMessage(); as err) {
        <div class="pointer-events-none fixed inset-x-0 bottom-8 z-[100] flex justify-center px-4">
          <div
            role="alert"
            class="pointer-events-auto max-w-md rounded-xl border border-piece-red/50 bg-[#1a1528] px-5 py-3 text-center text-sm text-white shadow-2xl"
          >
            {{ err }}
          </div>
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
  readonly auth = inject(AuthService);
  readonly game = inject(GameSocketService);
  readonly detail = signal<MatchDetailDto | null>(null);
  readonly error = signal<string | null>(null);

  readonly status = computed(() => this.game.status() ?? this.detail()?.status ?? null);
  readonly canPlay = computed(
    () =>
      !!this.game.me() &&
      this.status() === MatchStatus.LIVE &&
      !this.game.me()?.eliminated &&
      !this.game.introBusy()
  );
  readonly removed = computed(() => {
    const roster = this.game.roster();
    const userId = this.auth.user()?.id;
    return roster.length > 0 && !!userId && !roster.some((player) => player.userId === userId);
  });

  asMarriage(state: unknown): MarriageGameState | null {
    return state && typeof state === 'object' && isMarriageState(state as never)
      ? (state as MarriageGameState)
      : null;
  }

  onMeldCardRemove(payload: { cardId: string; meldIndex: number }): void {
    this.game.marriageRemoveMeldCard(payload.cardId, payload.meldIndex);
  }

  async ngOnInit(): Promise<void> {
    const matchId = this.route.snapshot.paramMap.get('matchId');
    if (!matchId) {
      return;
    }
    try {
      this.detail.set(await this.api.match(matchId));
      this.game.attach(matchId, 'player');
      this.game.seed(this.detail()?.gameState ?? null);
      this.game.seedRoster(this.detail()?.players ?? []);
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }

  ngOnDestroy(): void {
    this.game.detach();
  }
}
