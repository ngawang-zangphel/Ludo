import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GameType, PlayerColor, SnakesLevelId } from '@ludo-game/shared-types';
import { AuthService } from '../../../../core/auth/auth.service';
import { LocalMatchService } from '../../services/local-match.service';
import { GameTableComponent } from '../../components/game-table/game-table';
import { SnakesLayoutEditorComponent } from '../../components/snakes-layout-editor/snakes-layout-editor';
import { SnakesPresetPickerComponent } from '../../components/snakes-preset-picker/snakes-preset-picker';
import { PLAYER_SWATCH } from '../../models/theme';

@Component({
  selector: 'ludo-local-match-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [LocalMatchService],
  imports: [
    FormsModule,
    GameTableComponent,
    RouterLink,
    SnakesLayoutEditorComponent,
    SnakesPresetPickerComponent,
  ],
  template: `
    <div class="min-h-screen px-4 py-6 lg:px-8">
      <header class="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-arena-gold">Hot-seat · offline engine</p>
          <h1 class="font-display text-3xl font-bold text-white md:text-4xl">Hot-seat arena</h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <a
            [routerLink]="homeLink()"
            class="rounded-full border border-arena-line px-4 py-2 text-sm text-arena-mist"
          >
            {{ homeLabel() }}
          </a>
          @if (match.phase() === 'playing') {
            <button
              type="button"
              class="rounded-full border border-arena-line px-4 py-2 text-sm text-arena-mist hover:border-arena-gold"
              (click)="match.backToSetup()"
            >
              Change setup
            </button>
            <button
              type="button"
              class="rounded-full border border-arena-gold px-4 py-2 text-sm text-arena-gold"
              (click)="match.startMatch()"
            >
              Restart
            </button>
          }
        </div>
      </header>

      @if (match.phase() === 'setup') {
        <section class="mx-auto max-w-3xl rounded-3xl border border-arena-line bg-arena-navy/80 p-5 md:p-6">
          <p class="text-xs uppercase tracking-[0.25em] text-arena-gold/80">Step 1</p>
          <h2 class="mt-1 font-display text-2xl text-white">Choose game & players</h2>
          <p class="mt-2 text-sm text-arena-mist/70">
            Pick the game, how many people are playing, then set each name and color. Start when ready.
          </p>

          <div class="mt-6">
            <p class="text-xs uppercase tracking-[0.25em] text-arena-gold/80">Game</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-full px-4 py-2 text-sm"
                [class.bg-arena-gold]="match.gameType() === GameType.LUDO"
                [class.text-arena-ink]="match.gameType() === GameType.LUDO"
                [class.border]="match.gameType() !== GameType.LUDO"
                [class.border-arena-line]="match.gameType() !== GameType.LUDO"
                (click)="match.setGameType(GameType.LUDO)"
              >
                Ludo
              </button>
              <button
                type="button"
                class="rounded-full px-4 py-2 text-sm"
                [class.bg-arena-gold]="match.gameType() === GameType.SNAKES"
                [class.text-arena-ink]="match.gameType() === GameType.SNAKES"
                [class.border]="match.gameType() !== GameType.SNAKES"
                [class.border-arena-line]="match.gameType() !== GameType.SNAKES"
                (click)="match.setGameType(GameType.SNAKES)"
              >
                Snakes & Ladders
              </button>
            </div>
          </div>

          @if (match.gameType() === GameType.SNAKES) {
            <div class="mt-6 space-y-3">
              <arena-snakes-preset-picker
                [value]="match.snakesLevelId()"
                (valueChange)="match.setSnakesLevel($event)"
              />
              @if (match.snakesLevelId() === SnakesLevelId.CUSTOM) {
                <arena-snakes-layout-editor
                  [layout]="match.customLayout()"
                  [compact]="true"
                  (layoutChange)="match.setCustomLayout($event)"
                />
              }
            </div>
          }

          <div class="mt-6">
            <div class="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.25em] text-arena-gold/80">Players</p>
                <p class="mt-1 text-sm text-arena-mist/70">2 to 4 people at this table</p>
              </div>
              <div class="flex flex-wrap gap-2">
                @for (count of playerCounts; track count) {
                  <button
                    type="button"
                    class="rounded-full px-3 py-1.5 text-sm"
                    [class.bg-arena-gold]="match.playerCount() === count"
                    [class.text-arena-ink]="match.playerCount() === count"
                    [class.border]="match.playerCount() !== count"
                    [class.border-arena-line]="match.playerCount() !== count"
                    (click)="match.setPlayerCount(count)"
                  >
                    {{ count }}
                  </button>
                }
              </div>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              @for (slot of match.playerSlots(); track $index; let index = $index) {
                <div class="rounded-2xl border border-arena-line/80 bg-black/20 p-3">
                  <label class="block text-xs uppercase tracking-wider text-arena-mist/50">
                    Player {{ index + 1 }}
                    <input
                      class="mt-1.5 w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2 text-sm text-white outline-none focus:border-arena-gold"
                      [name]="'playerName' + index"
                      [ngModel]="slot.name"
                      (ngModelChange)="match.setPlayerName(index, $event)"
                      maxlength="24"
                      placeholder="Enter name"
                      autocomplete="off"
                    />
                  </label>
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (color of match.colors; track color) {
                      <button
                        type="button"
                        class="h-8 w-8 rounded-full border-2 transition"
                        [style.background]="swatch(color)"
                        [class.border-white]="slot.color === color"
                        [class.scale-110]="slot.color === color"
                        [class.border-transparent]="slot.color !== color"
                        [attr.aria-label]="color"
                        [attr.aria-pressed]="slot.color === color"
                        (click)="match.setPlayerColor(index, color)"
                      ></button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          @if (match.errorMessage(); as err) {
            <p class="mt-4 text-sm text-piece-red">{{ err }}</p>
          }

          <button
            type="button"
            class="mt-6 w-full rounded-full bg-arena-gold px-4 py-3 font-display text-base font-semibold text-arena-ink disabled:opacity-40 sm:w-auto"
            [disabled]="!match.setupReady()"
            (click)="match.startMatch()"
          >
            Start match
          </button>
        </section>
      } @else if (match.state(); as state) {
        @if (match.gameType() === GameType.SNAKES && match.snakesLevelId() === SnakesLevelId.CUSTOM) {
          <div class="mx-auto mb-5 max-w-7xl">
            <arena-snakes-layout-editor
              [layout]="match.customLayout()"
              [showBoard]="false"
              (layoutChange)="match.setCustomLayout($event)"
            />
          </div>
        }

        <ludo-game-table
          [state]="state"
          [displayCoords]="match.displayCoords()"
          [interactive]="!match.animating()"
          [highlightValid]="true"
          [movingPieceId]="match.movingPieceId()"
          [hopTick]="match.hopTick()"
          [diceUi]="match.diceUi()"
          [canRoll]="match.canRoll()"
          [lastEvent]="match.lastEvent()"
          [errorMessage]="match.errorMessage()"
          [editable]="match.gameType() === GameType.SNAKES && match.snakesLevelId() === SnakesLevelId.CUSTOM"
          [pendingSquare]="editor()?.pendingFrom() ?? null"
          (pieceSelect)="match.move($event)"
          (roll)="match.roll()"
          (squareSelect)="editor()?.applySquare($event)"
        />

        @if (match.winner(); as winner) {
          <div class="pointer-events-none fixed inset-x-0 bottom-8 flex justify-center">
            <div class="rounded-full bg-arena-gold px-6 py-3 font-display text-lg font-semibold text-arena-ink shadow-2xl">
              {{ winner.name }} wins the arena
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class LocalMatchPage {
  readonly auth = inject(AuthService);
  readonly match = inject(LocalMatchService);
  readonly GameType = GameType;
  readonly SnakesLevelId = SnakesLevelId;
  readonly PlayerColor = PlayerColor;
  readonly playerCounts = [2, 3, 4] as const;
  readonly editor = viewChild(SnakesLayoutEditorComponent);

  swatch(color: PlayerColor): string {
    return PLAYER_SWATCH[color];
  }

  homeLink(): string {
    if (!this.auth.user()) {
      return '/login';
    }
    return this.auth.isAdmin() ? '/admin' : '/';
  }

  homeLabel(): string {
    return this.auth.user() ? 'Lobby' : 'Sign in';
  }
}
