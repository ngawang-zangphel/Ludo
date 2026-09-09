import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  GameType,
  MatchStatus,
  PlayerColor,
  SnakesCustomBoardDto,
  SnakesLevelId,
} from '@ludo-game/shared-types';
import { ArenaApiService } from '../../../../core/api/arena-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { httpErrorMessage, gameTypeLabel, placeLabel } from '../../../../shared/format';
import { LocalMatchService } from '../../services/local-match.service';
import { GameTableComponent } from '../../components/game-table/game-table';
import { SnakesBoardComponent } from '../../components/snakes-board/snakes-board';
import { SnakesLayoutEditorComponent } from '../../components/snakes-layout-editor/snakes-layout-editor';
import { SnakesPresetPickerComponent } from '../../components/snakes-preset-picker/snakes-preset-picker';
import { PLAYER_SWATCH } from '../../models/theme';
import { FinishCelebrationComponent } from '../../components/finish-celebration/finish-celebration';
import { readSnakesView3d, writeSnakesView3d } from '../../models/snakes-view';

@Component({
  selector: 'ludo-local-match-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [LocalMatchService],
  imports: [
    FormsModule,
    GameTableComponent,
    RouterLink,
    SnakesBoardComponent,
    SnakesLayoutEditorComponent,
    SnakesPresetPickerComponent,
    FinishCelebrationComponent,
  ],
  template: `
    <div
      class="min-h-screen px-4 py-4 lg:px-8"
      [class.arena-play-page]="match.phase() === 'playing'"
    >
      <header
        class="mx-auto mb-4 flex max-w-7xl flex-wrap items-center justify-between gap-3"
        [class.mb-6]="match.phase() === 'setup'"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-arena-gold">
            {{
              match.phase() === 'playing'
                ? match.playMode() === 'ai'
                  ? 'You vs AI'
                  : 'Hot-seat'
                : 'Hot-seat · pass and play'
            }}
          </p>
          <h1 class="font-display text-2xl font-bold text-white md:text-4xl">
            {{ match.phase() === 'playing' ? playTitle() : 'Hot-seat arena' }}
          </h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <a
            [routerLink]="homeLink()"
            class="rounded-full border border-arena-line px-4 py-2 text-sm text-arena-mist hover:border-arena-gold"
          >
            {{ homeLabel() }}
          </a>
          @if (match.phase() === 'playing') {
            @if (match.gameType() === GameType.SNAKES) {
              <button
                type="button"
                class="rounded-full px-4 py-2 text-sm"
                [class.bg-arena-gold]="view3d()"
                [class.text-arena-ink]="view3d()"
                [class.border]="!view3d()"
                [class.border-arena-line]="!view3d()"
                [class.text-arena-mist]="!view3d()"
                (click)="toggleView3d()"
              >
                {{ view3d() ? '3D view' : '2D view' }}
              </button>
            }
            <button
              type="button"
              class="rounded-full border border-arena-line px-4 py-2 text-sm text-arena-mist hover:border-arena-gold"
              (click)="match.backToSetup()"
            >
              Change setup
            </button>
            <button
              type="button"
              class="rounded-full bg-arena-gold px-4 py-2 text-sm font-semibold text-arena-ink"
              (click)="match.startMatch()"
            >
              Restart
            </button>
          }
        </div>
      </header>

      @if (match.phase() === 'setup') {
        <section
          class="mx-auto rounded-3xl border border-arena-line bg-arena-navy/80 p-5 md:p-6"
          [class.max-w-5xl]="match.gameType() === GameType.SNAKES"
          [class.max-w-3xl]="match.gameType() !== GameType.SNAKES"
        >
          <p class="text-xs uppercase tracking-[0.25em] text-arena-gold/80">Step 1</p>
          <h2 class="mt-1 font-display text-2xl text-white">Choose game & players</h2>
          <p class="mt-2 text-sm text-arena-mist/70">
            Pick the game, then play pass-and-play or a one-on-one match against Arena AI.
          </p>

          <div class="mt-6">
            <p class="text-xs uppercase tracking-[0.25em] text-arena-gold/80">Mode</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-full px-4 py-2 text-sm"
                [class.bg-arena-gold]="match.playMode() === 'hotseat'"
                [class.text-arena-ink]="match.playMode() === 'hotseat'"
                [class.border]="match.playMode() !== 'hotseat'"
                [class.border-arena-line]="match.playMode() !== 'hotseat'"
                (click)="match.setPlayMode('hotseat')"
              >
                Pass and play
              </button>
              <button
                type="button"
                class="rounded-full px-4 py-2 text-sm"
                [class.bg-arena-gold]="match.playMode() === 'ai'"
                [class.text-arena-ink]="match.playMode() === 'ai'"
                [class.border]="match.playMode() !== 'ai'"
                [class.border-arena-line]="match.playMode() !== 'ai'"
                (click)="match.setPlayMode('ai')"
              >
                Play vs AI
              </button>
            </div>
            @if (match.playMode() === 'ai') {
              <p class="mt-2 text-sm text-arena-mist/60">
                One on one. You take the first seat; Arena AI takes the other.
              </p>
            }
          </div>

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
                [showCreate]="true"
                [createSelected]="match.customSource() === 'create' && match.snakesLevelId() === SnakesLevelId.CUSTOM"
                (valueChange)="onSnakesLevel($event)"
                (createSelectedChange)="onCreateOwn($event)"
              />
              @if (match.snakesLevelId() !== SnakesLevelId.CUSTOM) {
                <div>
                  <arena-snakes-board [layout]="match.customLayout()" [compact]="true" />
                  <p class="mt-2 text-xs text-arena-mist/50">
                    {{ match.customLayout().snakes.length }} snakes ·
                    {{ match.customLayout().ladders.length }} ladders
                  </p>
                </div>
              } @else if (match.customSource() === 'library') {
                @if (boardsLoading()) {
                  <p class="text-sm text-arena-mist/60">Loading saved boards…</p>
                } @else if (boardsError(); as err) {
                  <p class="text-sm text-piece-red">{{ err }}</p>
                } @else {
                  <div class="grid gap-3 sm:grid-cols-2">
                    @for (board of customBoards(); track board.id) {
                      <article
                        class="cursor-pointer overflow-hidden rounded-2xl border bg-black/20 p-3 text-left transition hover:border-arena-gold/70"
                        [class.border-arena-gold]="match.selectedCustomBoardId() === board.id"
                        [class.border-arena-line]="match.selectedCustomBoardId() !== board.id"
                        role="button"
                        tabindex="0"
                        (click)="match.selectSavedBoard(board.id, board.layout)"
                        (keydown.enter)="match.selectSavedBoard(board.id, board.layout)"
                        (keydown.space)="$event.preventDefault(); match.selectSavedBoard(board.id, board.layout)"
                      >
                        <p class="font-display text-white">{{ board.name }}</p>
                        <p class="mt-1 text-xs text-arena-mist/50">
                          {{ board.layout.snakes.length }} snakes ·
                          {{ board.layout.ladders.length }} ladders
                        </p>
                        <div class="relative mt-2">
                          <arena-snakes-board [layout]="board.layout" [compact]="true" />
                          <div class="absolute inset-0" aria-hidden="true"></div>
                        </div>
                      </article>
                    } @empty {
                      <p
                        class="col-span-full rounded-2xl border border-dashed border-arena-line px-4 py-8 text-center text-sm text-arena-mist/60"
                      >
                        No saved custom boards yet. Choose Create your own to draw a board for this
                        match.
                      </p>
                    }
                  </div>
                }
              } @else {
                <p class="text-sm text-arena-mist/70">
                  Place snakes and ladders below. This board stays on this device for this match
                  only — it is not saved.
                </p>
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
                <p class="mt-1 text-sm text-arena-mist/70">
                  @if (match.playMode() === 'ai') {
                    You vs Arena AI
                  } @else {
                    2 to {{ match.allowedPlayerCounts().at(-1) }} people at this table
                  }
                </p>
              </div>
              @if (match.playMode() !== 'ai') {
                <div class="flex flex-wrap gap-2">
                  @for (count of match.allowedPlayerCounts(); track count) {
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
              }
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              @for (slot of match.playerSlots(); track $index; let index = $index) {
                <div class="rounded-2xl border border-arena-line/80 bg-black/20 p-3">
                  <label class="block text-xs uppercase tracking-wider text-arena-mist/50">
                    @if (match.playMode() === 'ai' && index === 0) {
                      You
                    } @else if (match.playMode() === 'ai' && index === 1) {
                      Opponent
                    } @else {
                      Player {{ index + 1 }}
                    }
                    <input
                      class="mt-1.5 w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2 text-sm text-white outline-none focus:border-arena-gold disabled:opacity-70"
                      [name]="'playerName' + index"
                      [ngModel]="slot.name"
                      (ngModelChange)="match.setPlayerName(index, $event)"
                      maxlength="24"
                      [placeholder]="match.playMode() === 'ai' && index === 0 ? 'Your name' : 'Enter name'"
                      [disabled]="match.playMode() === 'ai' && index === 1"
                      autocomplete="off"
                    />
                  </label>
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (color of match.colors(); track color) {
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

          @if (match.gameType() === GameType.SNAKES) {
            <div class="mt-6">
              <p class="text-xs uppercase tracking-[0.25em] text-arena-gold/80">Winners to finish</p>
              <p class="mt-1 text-sm text-arena-mist/70">
                Match ends when this many players reach 100. Remaining seats are ranked after.
              </p>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (count of winnerCapOptions(); track count) {
                  <button
                    type="button"
                    class="rounded-full px-3 py-1.5 text-sm"
                    [class.bg-arena-gold]="match.winnerCap() === count"
                    [class.text-arena-ink]="match.winnerCap() === count"
                    [class.border]="match.winnerCap() !== count"
                    [class.border-arena-line]="match.winnerCap() !== count"
                    (click)="match.setWinnerCap(count)"
                  >
                    {{ count }}
                  </button>
                }
              </div>
            </div>
          }

          @if (match.errorMessage(); as err) {
            <p class="mt-4 text-sm text-piece-red">{{ err }}</p>
          }
          @if (
            match.gameType() === GameType.SNAKES &&
            match.snakesLevelId() === SnakesLevelId.CUSTOM &&
            match.customSource() === 'library' &&
            !match.selectedCustomBoardId()
          ) {
            <p class="mt-4 text-sm text-arena-mist/60">
              Select a saved board to start, or switch to Create your own.
            </p>
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
        @if (match.editingOwnBoard()) {
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
          [interactive]="!match.animating() && !match.isAiTurn()"
          [highlightValid]="!match.isAiTurn()"
          [movingPieceId]="match.movingPieceId()"
          [hopTick]="match.hopTick()"
          [diceUi]="match.diceUi()"
          [canRoll]="match.canRoll() && !match.isAiTurn()"
          [autoRoll]="false"
          [lastEvent]="match.lastEvent()"
          [errorMessage]="match.errorMessage()"
          [editable]="match.editingOwnBoard()"
          [pendingSquare]="editor()?.pendingFrom() ?? null"
          [view3d]="view3d() && !match.editingOwnBoard()"
          (pieceSelect)="match.move($event)"
          (roll)="match.roll()"
          (squareSelect)="editor()?.applySquare($event)"
        />

        <arena-finish-celebration [celebration]="match.celebration()" />

        @if (match.state()?.status === MatchStatus.COMPLETED && match.placements(); as places) {
          <div class="pointer-events-none fixed inset-x-0 bottom-8 z-20 flex justify-center px-4">
            <div
              class="max-w-md rounded-3xl border border-arena-gold/40 bg-arena-navy/95 px-6 py-4 shadow-[0_12px_40px_rgba(228,193,106,0.35)]"
            >
              <p class="text-center text-[10px] uppercase tracking-[0.28em] text-arena-gold/80">Standings</p>
              <ol class="mt-2 space-y-1">
                @for (place of places; track place.place) {
                  <li class="flex items-baseline justify-center gap-3 font-display text-lg text-white">
                    <span class="text-arena-gold">{{ placeLabel(place.place) }}</span>
                    <span [class.text-arena-gold]="place.place === 1">{{ place.name }}</span>
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
export class LocalMatchPage implements OnInit {
  readonly auth = inject(AuthService);
  readonly match = inject(LocalMatchService);
  private readonly api = inject(ArenaApiService);
  readonly GameType = GameType;
  readonly MatchStatus = MatchStatus;
  readonly SnakesLevelId = SnakesLevelId;
  readonly PlayerColor = PlayerColor;
  readonly placeLabel = placeLabel;
  readonly editor = viewChild(SnakesLayoutEditorComponent);
  readonly customBoards = signal<SnakesCustomBoardDto[]>([]);
  readonly boardsLoading = signal(false);
  readonly boardsError = signal<string | null>(null);
  readonly view3d = signal(readSnakesView3d());

  ngOnInit(): void {
    const name = this.auth.user()?.name?.trim();
    if (name && !this.match.playerSlots()[0]?.name) {
      this.match.setHumanName(name);
    }
    void this.loadBoards();
  }

  onSnakesLevel(levelId: SnakesLevelId): void {
    if (levelId === SnakesLevelId.CUSTOM) {
      this.match.setCustomSource('library');
      this.ensureSavedBoardSelected();
      return;
    }
    this.match.setSnakesLevel(levelId);
  }

  onCreateOwn(create: boolean): void {
    if (create) {
      this.match.setCustomSource('create');
    }
  }

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

  playTitle(): string {
    return gameTypeLabel(this.match.gameType());
  }

  winnerCapOptions(): number[] {
    return Array.from({ length: this.match.playerCount() }, (_, index) => index + 1);
  }

  toggleView3d(): void {
    const next = !this.view3d();
    this.view3d.set(next);
    writeSnakesView3d(next);
  }

  private async loadBoards(): Promise<void> {
    this.boardsLoading.set(true);
    this.boardsError.set(null);
    try {
      this.customBoards.set(await this.api.snakesBoards());
      this.ensureSavedBoardSelected();
    } catch (error) {
      this.boardsError.set(httpErrorMessage(error));
    } finally {
      this.boardsLoading.set(false);
    }
  }

  private ensureSavedBoardSelected(): void {
    if (
      this.match.snakesLevelId() !== SnakesLevelId.CUSTOM ||
      this.match.customSource() !== 'library' ||
      this.match.selectedCustomBoardId()
    ) {
      return;
    }
    const first = this.customBoards()[0];
    if (first) {
      this.match.selectSavedBoard(first.id, first.layout);
    }
  }
}
