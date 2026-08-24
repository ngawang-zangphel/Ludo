import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameSocketService } from '../../services/game-socket.service';
import { ArenaApiService } from '../../../../core/api/arena-api.service';
import { GameTableComponent } from '../../components/game-table/game-table';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'ludo-broadcast-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GameSocketService],
  host: { class: 'broadcast-screen' },
  imports: [GameTableComponent, RouterLink],
  template: `
    <div class="min-h-screen px-6 py-8">
      <div class="mx-auto mb-6 max-w-7xl text-center">
        <p class="text-xs uppercase tracking-[0.4em] text-arena-gold">Ludo Arena · Live broadcast</p>
        <h1 class="mt-2 font-display text-4xl font-bold text-white md:text-5xl">Projector</h1>
      </div>

      @if (game.state(); as state) {
        <ludo-game-table
          [state]="state"
          [displayCoords]="game.displayCoords()"
          [interactive]="false"
          [highlightValid]="true"
          [diceUi]="game.diceUi()"
          [canRoll]="false"
          [lastEvent]="game.lastEvent()"
        />
      } @else {
        <div class="mx-auto mt-24 max-w-xl rounded-3xl border border-dashed border-arena-line p-12 text-center">
          <p class="font-display text-2xl text-white">Standing by</p>
          <p class="mt-2 text-arena-mist/70">{{ message() }}</p>
          @if (!auth.user()) {
            <a routerLink="/login" class="mt-6 inline-block text-sm text-arena-gold hover:underline">Sign in</a>
          }
        </div>
      }

      @if (game.winner(); as winner) {
        <div class="pointer-events-none fixed inset-x-0 bottom-10 flex justify-center">
          <div class="rounded-full bg-arena-gold px-8 py-4 font-display text-2xl font-semibold text-arena-ink shadow-2xl">
            {{ winner.name }} wins
          </div>
        </div>
      }
    </div>
  `,
})
export class BroadcastPage implements OnInit, OnDestroy {
  private readonly api = inject(ArenaApiService);
  readonly auth = inject(AuthService);
  readonly game = inject(GameSocketService);
  readonly message = signal('Waiting for an admin to select a match.');

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
