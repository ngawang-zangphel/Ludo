import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  cloneSnakesLayout,
  GAME_TYPE_LABEL,
  GameType,
  isMarriageRules,
  isSnakesRules,
  BulkMatchAction,
  MARRIAGE_DECK_OPTIONS,
  MatchStatus,
  MatchSummaryDto,
  maxMarriagePlayers,
  maxPlayersForGame,
  ParticipantDto,
  resolveSnakesRules,
  SNAKES_LEVEL_LABEL,
  SnakesBoardLayout,
  SnakesCustomBoardDto,
  SnakesLevelId,
  TournamentDto,
  TournamentStatus,
  UserDto,
  UserRole,
} from '@ludo-game/shared-types';
import { ArenaApiService } from '../../../core/api/arena-api.service';
import { MultiAutocompleteComponent } from '../../../shared/ui/multi-autocomplete';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge';
import { httpErrorMessage, playerNames, readyCountLabel } from '../../../shared/format';
import { SnakesBoardComponent } from '../../game/components/snakes-board/snakes-board';
import { SnakesPresetPickerComponent } from '../../game/components/snakes-preset-picker/snakes-preset-picker';

@Component({
  selector: 'ludo-admin-tournaments-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MultiAutocompleteComponent,
    StatusBadgeComponent,
    SnakesBoardComponent,
    SnakesPresetPickerComponent,
  ],
  template: `
    <div class="mx-auto max-w-6xl px-4 py-8">
      @if (grouping()) {
        <div class="fixed inset-0 z-50 grid place-items-center bg-black/55 backdrop-blur-[2px]">
          <div class="flex flex-col items-center gap-4 rounded-3xl border border-arena-gold/40 bg-arena-navy px-10 py-8 shadow-2xl">
            <span
              class="h-11 w-11 animate-spin rounded-full border-[3px] border-arena-gold/25 border-t-arena-gold"
              aria-hidden="true"
            ></span>
            <p class="font-display text-xl text-white">Dividing groups…</p>
            <p class="text-sm text-arena-mist/70">Seating free players at tables</p>
          </div>
        </div>
      }
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <a routerLink="/admin" class="text-xs uppercase tracking-[0.3em] text-arena-gold hover:underline">
            Dashboard
          </a>
          <h1 class="mt-2 font-display text-3xl font-bold text-white">Tournaments</h1>
        </div>
        <a
          routerLink="/admin/boards"
          class="rounded-full border border-arena-gold px-4 py-2 text-sm text-arena-gold"
        >
          Custom boards
        </a>
      </div>

      @if (error()) {
        <p class="mt-4 text-piece-red">{{ error() }}</p>
      }

      <section class="mt-6">
        <form
          class="max-w-xl rounded-3xl border border-arena-line bg-arena-navy/80 p-5"
          novalidate
          (ngSubmit)="createTournament()"
        >
          <h2 class="font-display text-lg">New tournament</h2>
          <input
            class="mt-3 w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2"
            name="tournamentName"
            placeholder="Tournament name"
            [(ngModel)]="tournamentName"
          />
          <div class="mt-3 flex gap-2">
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-sm"
              [class.bg-arena-gold]="tournamentGameType === GameType.LUDO"
              [class.text-arena-ink]="tournamentGameType === GameType.LUDO"
              [class.border]="tournamentGameType !== GameType.LUDO"
              [class.border-arena-line]="tournamentGameType !== GameType.LUDO"
              (click)="tournamentGameType = GameType.LUDO"
            >
              Ludo
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-sm"
              [class.bg-arena-gold]="tournamentGameType === GameType.SNAKES"
              [class.text-arena-ink]="tournamentGameType === GameType.SNAKES"
              [class.border]="tournamentGameType !== GameType.SNAKES"
              [class.border-arena-line]="tournamentGameType !== GameType.SNAKES"
              (click)="tournamentGameType = GameType.SNAKES"
            >
              Snakes & Ladders
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-sm"
              [class.bg-arena-gold]="tournamentGameType === GameType.MARRIAGE"
              [class.text-arena-ink]="tournamentGameType === GameType.MARRIAGE"
              [class.border]="tournamentGameType !== GameType.MARRIAGE"
              [class.border-arena-line]="tournamentGameType !== GameType.MARRIAGE"
              (click)="tournamentGameType = GameType.MARRIAGE"
            >
              Marriage
            </button>
          </div>
          @if (tournamentGameType === GameType.MARRIAGE) {
            <div class="mt-3">
              <p class="text-xs uppercase tracking-[0.25em] text-arena-gold/80">Decks</p>
              <p class="mt-1 text-sm text-arena-mist/60">
                Classic is 3. More decks seat more players (up to {{ maxSeatsForDecks(marriageDeckCount) }}).
              </p>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (decks of marriageDeckOptions; track decks) {
                  <button
                    type="button"
                    class="rounded-full px-3 py-1.5 text-sm"
                    [class.bg-arena-gold]="marriageDeckCount === decks"
                    [class.text-arena-ink]="marriageDeckCount === decks"
                    [class.border]="marriageDeckCount !== decks"
                    [class.border-arena-line]="marriageDeckCount !== decks"
                    (click)="marriageDeckCount = decks"
                  >
                    {{ decks }}
                  </button>
                }
              </div>
              <p class="mt-2 text-xs text-arena-mist/60">Dublee wins are disabled.</p>
            </div>
          }
          @if (tournamentGameType === GameType.SNAKES) {
            <div class="mt-4">
              <arena-snakes-preset-picker
                [value]="snakesLevelId"
                (valueChange)="setCreateLevel($event)"
              />
              @if (snakesLevelId === SnakesLevelId.CUSTOM) {
                <div class="mt-3 space-y-3">
                  <label class="block">
                    <span class="text-xs uppercase tracking-[0.25em] text-arena-gold/80">Saved board</span>
                    <select
                      class="field mt-2 w-full"
                      name="selectedBoardId"
                      [ngModel]="selectedBoardId"
                      (ngModelChange)="onSelectBoard($event)"
                    >
                      <option value="">Select a custom board</option>
                      @for (board of customBoards(); track board.id) {
                        <option [value]="board.id">{{ board.name }}</option>
                      }
                    </select>
                  </label>
                  @if (customBoards().length === 0) {
                    <p class="text-sm text-arena-mist/60">
                      No custom boards yet.
                      <a routerLink="/admin/boards" class="text-arena-gold hover:underline">Create one</a>
                    </p>
                  } @else if (selectedBoardId) {
                    <arena-snakes-board [layout]="customLayout" [compact]="true" />
                  }
                </div>
              } @else {
                <div class="mt-3">
                  <arena-snakes-board [layout]="customLayout" [compact]="true" />
                </div>
              }
            </div>
          }
          <button
            class="mt-3 rounded-full bg-arena-gold px-4 py-2 text-sm font-semibold text-arena-ink"
            type="submit"
          >
            Create
          </button>
        </form>
      </section>

      <section class="mt-8">
        <div class="flex items-end justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-arena-gold">Bracket</p>
            <h2 class="mt-1 font-display text-xl text-white">Your tournaments</h2>
          </div>
          <p class="text-sm text-arena-mist/50">{{ tournaments().length }} total</p>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (tournament of tournaments(); track tournament.id) {
            <article
              class="group flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border bg-arena-navy/80 text-left transition duration-200 hover:-translate-y-1 hover:border-arena-gold/70"
              [class.border-arena-gold]="selected()?.id === tournament.id"
              [class.shadow-[0_16px_40px_rgba(228,193,106,0.16)]]="selected()?.id === tournament.id"
              [class.border-arena-line]="selected()?.id !== tournament.id"
              (click)="select(tournament)"
            >
              <div [class]="'h-1.5 w-full ' + accentBar(tournament.status)"></div>
              <div class="flex flex-1 flex-col p-5">
                <div class="flex items-start justify-between gap-3">
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-arena-gold/10 text-arena-gold"
                    aria-hidden="true"
                  >
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M8 4h8v2a4 4 0 0 1-4 4 4 4 0 0 1-4-4V4Zm0 0H5a2 2 0 0 0 2 4m9-4h3a2 2 0 0 1-2 4M12 10v3m-4 7h8m-6-4h4"
                      />
                    </svg>
                  </div>
                  <ludo-status-badge [status]="tournament.status" />
                </div>
                <h3 class="mt-4 font-display text-lg leading-snug text-white">{{ tournament.name }}</h3>
                <p class="mt-1 text-xs text-arena-gold/80">
                  {{ GAME_TYPE_LABEL[tournament.gameType] || 'Ludo' }}
                  @if (tournament.gameType === GameType.SNAKES && isSnakesRules(tournament.rules)) {
                    · {{ SNAKES_LEVEL_LABEL[tournament.rules.levelId] || 'Classic' }}
                  }
                  @if (tournament.gameType === GameType.MARRIAGE && isMarriageRules(tournament.rules)) {
                    · {{ tournament.rules.deckCount }} decks
                  }
                </p>
                <p class="mt-1 text-xs text-arena-mist/50">Created {{ formatDate(tournament.createdAt) }}</p>
                <div class="mt-3 flex flex-wrap gap-1.5">
                  @for (round of tournament.rounds.slice(0, 3); track round.number) {
                    <span class="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-arena-mist/60">
                      {{ roundLabel(round.name) }}
                    </span>
                  }
                  @if (tournament.rounds.length > 3) {
                    <span class="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-arena-mist/50">
                      +{{ tournament.rounds.length - 3 }}
                    </span>
                  }
                </div>
                <div class="mt-4 grid grid-cols-3 gap-2">
                  <div class="rounded-2xl bg-black/25 px-3 py-2">
                    <p class="text-[10px] uppercase tracking-wider text-arena-mist/40">Players</p>
                    <p class="mt-0.5 font-display text-lg text-white">{{ tournament.playerCount }}</p>
                  </div>
                  <div class="rounded-2xl bg-black/25 px-3 py-2">
                    <p class="text-[10px] uppercase tracking-wider text-arena-mist/40">Tables</p>
                    <p class="mt-0.5 font-display text-lg text-white">{{ tournament.tableCount }}</p>
                  </div>
                  <div class="rounded-2xl bg-black/25 px-3 py-2">
                    <p class="text-[10px] uppercase tracking-wider text-arena-mist/40">Rounds</p>
                    <p class="mt-0.5 font-display text-lg text-white">{{ tournament.rounds.length }}</p>
                  </div>
                </div>
                <div class="mt-auto pt-4">
                  <div class="flex items-center justify-between gap-3 border-t border-arena-line/60 pt-3 text-xs">
                    @if (selected()?.id === tournament.id) {
                      <span class="font-medium text-arena-gold">Managing this tournament</span>
                    } @else {
                      <span class="text-arena-mist/40 transition group-hover:text-arena-mist/80">Open to manage</span>
                    }
                    <button
                      type="button"
                      class="rounded-full border border-piece-red px-3 py-1.5 text-xs text-piece-red hover:bg-piece-red/10"
                      (click)="removeTournament(tournament, $event)"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </article>
          } @empty {
            <p class="col-span-full rounded-3xl border border-dashed border-arena-line px-4 py-10 text-center text-sm text-arena-mist/60">
              No tournaments yet. Create one above to get started.
            </p>
          }
        </div>
      </section>

      @if (selected(); as tournament) {
        @if (tournament.gameType === GameType.SNAKES && isSnakesRules(tournament.rules)) {
          <section class="mt-8 rounded-3xl border border-arena-line bg-arena-navy/80 p-5">
            <div class="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.25em] text-arena-gold">Board</p>
                <h2 class="mt-1 font-display text-lg text-white">
                  {{ SNAKES_LEVEL_LABEL[tournament.rules.levelId] || 'Classic' }} preview
                </h2>
                <p class="mt-1 text-sm text-arena-mist/60">
                  {{ tournament.rules.layout.snakes.length }} snakes ·
                  {{ tournament.rules.layout.ladders.length }} ladders
                </p>
              </div>
            </div>
            <div class="mt-4 max-w-md">
              <arena-snakes-board [layout]="tournament.rules.layout" [compact]="true" />
            </div>
          </section>
        }

        <section class="mt-8 grid gap-6 lg:grid-cols-2">
          <div class="rounded-3xl border border-arena-line bg-arena-navy/80 p-5">
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-display text-lg">Participants</h2>
              <select
                class="field max-w-44"
                name="tournamentStatus"
                [ngModel]="tournament.status"
                (ngModelChange)="setStatus($event)"
              >
                @for (status of statuses; track status) {
                  <option [value]="status">{{ status }}</option>
                }
              </select>
            </div>
            <ul class="mt-3 space-y-2 text-sm">
              @for (participant of participants(); track participant.id) {
                <li class="flex flex-wrap items-center gap-2">
                  <span>{{ participant.seed }}. {{ participant.name }} · {{ participant.status }}</span>
                  @if (participantSeatLabel(participant.userId); as seat) {
                    <span
                      class="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
                      [class.bg-piece-blue/15]="seat === 'Pending'"
                      [class.text-piece-blue]="seat === 'Pending'"
                      [class.bg-piece-red/15]="seat === 'In a match'"
                      [class.text-piece-red]="seat === 'In a match'"
                    >
                      {{ seat }}
                    </span>
                  }
                </li>
              } @empty {
                <li class="text-arena-mist/60">No participants yet.</li>
              }
            </ul>

            <div class="mt-4 border-t border-arena-line/80 pt-4">
              <p class="text-sm font-medium text-white">Add players</p>
              <p class="mt-1 text-sm text-arena-mist/60">
                Search and select one or more players, then Add.
                @if (registerUserIds().length) {
                  · {{ registerUserIds().length }} selected
                }
              </p>
              @if (availablePlayers().length) {
                <div class="mt-3">
                  <ludo-multi-autocomplete
                    [options]="availablePlayerOptions()"
                    [(selectedIds)]="registerUserIds"
                    placeholder="Type a player name…"
                  />
                </div>
              } @else {
                <p class="mt-3 text-sm text-arena-mist/60">
                  All players are already registered, or
                  <a routerLink="/admin/users" class="text-arena-gold hover:underline">create users</a>
                  first.
                </p>
              }
              <button
                type="button"
                class="mt-4 rounded-full bg-arena-gold px-4 py-2 text-sm font-semibold text-arena-ink disabled:opacity-40"
                [disabled]="registerUserIds().length === 0"
                (click)="registerSelected()"
              >
                Add {{ registerUserIds().length || '' }}
              </button>
            </div>
          </div>

          <div class="rounded-3xl border border-arena-line bg-arena-navy/80 p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="font-display text-lg">Group tables</h2>
                <p class="mt-1 text-sm text-arena-mist/70">
                  One tournament can run many groups at once. Each group of 2–{{ maxTableSeats() }} players gets its own table.
                </p>
              </div>
              @if (rounds().length > 1) {
                <select
                  class="field max-w-[9rem] text-sm"
                  name="roundNumber"
                  [ngModel]="roundNumber"
                  (ngModelChange)="onRoundChange($event)"
                >
                  @for (round of rounds(); track round.number) {
                    <option [ngValue]="round.number">{{ roundLabel(round.name) }}</option>
                  }
                </select>
              }
            </div>

            <div class="mt-5 space-y-5">
              @if (matches().length) {
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="rounded-full border border-arena-line px-3 py-1.5 text-xs"
                    (click)="toggleSelectAllTables()"
                  >
                    {{ allTablesSelected() ? 'Clear selection' : 'Select all tables' }}
                  </button>
                  @if (selectedTableIds().length) {
                    <span class="text-xs text-arena-mist/70">{{ selectedTableIds().length }} selected</span>
                    <button type="button" class="rounded-full bg-arena-gold px-3 py-1.5 text-xs font-semibold text-arena-ink disabled:opacity-40" [disabled]="bulkBusy()" (click)="runBulk('ready')">Ready</button>
                    <button type="button" class="rounded-full bg-arena-gold px-3 py-1.5 text-xs font-semibold text-arena-ink disabled:opacity-40" [disabled]="bulkBusy()" (click)="runBulk('start')">Start</button>
                    <button type="button" class="rounded-full border border-piece-red px-3 py-1.5 text-xs text-piece-red disabled:opacity-40" [disabled]="bulkBusy()" (click)="runBulk('cancel')">Cancel</button>
                    <button type="button" class="rounded-full border border-piece-red px-3 py-1.5 text-xs text-piece-red disabled:opacity-40" [disabled]="bulkBusy()" (click)="runBulk('delete')">Delete</button>
                  }
                </div>
              }
              @for (section of groupedTables(); track section.roundNumber) {
                <div>
                  <p class="text-xs uppercase tracking-[0.2em] text-arena-gold">
                    {{ roundLabel(section.name) }}
                  </p>
                  <div class="mt-2 grid gap-3 sm:grid-cols-2">
                    @for (match of section.tables; track match.id) {
                      <article class="rounded-2xl border border-arena-line p-4">
                        <div class="flex items-start justify-between gap-2">
                          <div class="flex min-w-0 items-start gap-2">
                            <input
                              type="checkbox"
                              class="mt-1"
                              [checked]="isTableSelected(match.id)"
                              [attr.aria-label]="'Select group ' + groupLetter(match)"
                              (change)="toggleTable(match.id)"
                            />
                            <div>
                              <p class="text-xs uppercase tracking-wider text-arena-mist/50">
                                Group {{ groupLetter(match) }}
                              </p>
                              <p class="mt-1 font-display text-white">{{ playerNames(match) }}</p>
                              <p class="mt-1 text-xs text-arena-mist/60">
                                @if (match.status === MatchStatus.WAITING || match.status === MatchStatus.READY) {
                                  {{ readyCountLabel(match) }} — mark Ready, then Start.
                                } @else {
                                  {{ match.status.replace('_', ' ') }}
                                }
                              </p>
                            </div>
                          </div>
                          <ludo-status-badge [status]="match.status" />
                        </div>
                        <div class="mt-3 flex flex-wrap gap-2">
                          <a
                            class="rounded-full bg-arena-gold px-3 py-1.5 text-xs font-semibold text-arena-ink"
                            [routerLink]="['/admin/matches', match.id]"
                          >
                            Open table
                          </a>
                          <button type="button" class="rounded-full border border-piece-red px-3 py-1.5 text-xs text-piece-red" (click)="remove(match)">
                            Delete table
                          </button>
                        </div>
                      </article>
                    }
                  </div>
                </div>
              } @empty {
                <p class="rounded-2xl border border-dashed border-arena-line px-4 py-6 text-sm text-arena-mist/60">
                  No groups yet. Seat players below, or split everyone into groups.
                </p>
              }
            </div>

            <div class="mt-6 border-t border-arena-line/80 pt-5">
              <p class="text-sm font-medium text-white">Seat a new group</p>

              @if (freeParticipants().length >= 2) {
                <p class="mt-1 text-sm text-arena-mist/70">
                  {{ selectedPlayerIds().length }} selected · search and pick 2–{{ maxTableSeats() }} free players for one group, or split everyone.
                  Players already in a match are unavailable.
                </p>
                <div class="mt-3">
                  <ludo-multi-autocomplete
                    [options]="freePlayerOptions()"
                    [(selectedIds)]="selectedPlayerIds"
                    [maxSelected]="maxTableSeats()"
                    placeholder="Type a player name…"
                  />
                </div>
                @if (seatedParticipants().length) {
                  <p class="mt-3 text-xs text-arena-mist/50">
                    Busy (in a match): {{ seatedNames() }}
                  </p>
                }
                <div class="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-full bg-arena-gold px-4 py-2 text-sm font-semibold text-arena-ink disabled:opacity-40"
                    [disabled]="!canCreate()"
                    (click)="createMatch()"
                  >
                    Invite {{ selectedPlayerIds().length || '' }} to a group
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-arena-gold px-4 py-2 text-sm text-arena-gold disabled:opacity-40"
                    [disabled]="grouping()"
                    (click)="createGroups()"
                  >
                    {{ grouping() ? 'Dividing groups…' : 'Split everyone into groups' }}
                  </button>
                </div>
                @if (leftoverCount() === 1) {
                  <p class="mt-3 text-xs text-arena-mist/50">
                    One player will wait — a group needs at least 2 people.
                  </p>
                }
              } @else if (seatedParticipants().length) {
                <p class="mt-2 rounded-2xl bg-black/20 px-4 py-3 text-sm text-arena-mist/70">
                  {{ seatedSummary() }} Players in an active match cannot join another table until it finishes or is deleted.
                </p>
              } @else {
                <p class="mt-2 text-sm text-arena-mist/60">
                  Add at least 2 participants on the left, then you can seat a table.
                </p>
              }
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .field {
      border-radius: 0.75rem;
      border: 1px solid var(--color-arena-line);
      background: var(--color-arena-ink);
      padding: 0.5rem 0.75rem;
    }
  `,
})
export class AdminTournamentsPage implements OnInit {
  private readonly api = inject(ArenaApiService);
  readonly statuses = Object.values(TournamentStatus);
  readonly tournaments = signal<TournamentDto[]>([]);
  readonly customBoards = signal<SnakesCustomBoardDto[]>([]);
  readonly selected = signal<TournamentDto | null>(null);
  readonly participants = signal<ParticipantDto[]>([]);
  readonly matches = signal<MatchSummaryDto[]>([]);
  readonly users = signal<UserDto[]>([]);
  readonly error = signal<string | null>(null);
  readonly playerNames = playerNames;
  readonly selectedPlayerIds = signal<string[]>([]);
  readonly grouping = signal(false);
  readonly bulkBusy = signal(false);
  readonly selectedTableIds = signal<string[]>([]);
  readonly registerUserIds = signal<string[]>([]);
  readonly readyCountLabel = readyCountLabel;
  readonly MatchStatus = MatchStatus;
  readonly GAME_TYPE_LABEL = GAME_TYPE_LABEL;
  readonly SNAKES_LEVEL_LABEL = SNAKES_LEVEL_LABEL;
  readonly GameType = GameType;
  readonly SnakesLevelId = SnakesLevelId;
  readonly isSnakesRules = isSnakesRules;
  readonly isMarriageRules = isMarriageRules;

  readonly rounds = computed(() => this.selected()?.rounds ?? []);

  readonly busyPlayerIds = computed(() => {
    const ids = new Set<string>();
    for (const match of this.matches()) {
      if (match.status === MatchStatus.COMPLETED || match.status === MatchStatus.CANCELLED) {
        continue;
      }
      for (const player of match.players) {
        ids.add(player.userId);
      }
    }
    return ids;
  });

  readonly playerMatchStatus = computed(() => {
    const byUser = new Map<string, MatchStatus>();
    for (const match of this.matches()) {
      if (match.status === MatchStatus.COMPLETED || match.status === MatchStatus.CANCELLED) {
        continue;
      }
      for (const player of match.players) {
        byUser.set(player.userId, match.status);
      }
    }
    return byUser;
  });

  readonly freeParticipants = computed(() =>
    this.participants().filter((player) => !this.busyPlayerIds().has(player.userId))
  );

  readonly seatedParticipants = computed(() =>
    this.participants().filter((player) => this.busyPlayerIds().has(player.userId))
  );

  readonly leftoverCount = computed(() => (this.freeParticipants().length === 1 ? 1 : 0));

  readonly registeredUserIds = computed(
    () => new Set(this.participants().map((participant) => participant.userId))
  );

  readonly availablePlayers = computed(() =>
    this.users().filter(
      (user) => user.role === UserRole.PLAYER && !this.registeredUserIds().has(user.id)
    )
  );

  readonly availablePlayerOptions = computed(() =>
    this.availablePlayers().map((user) => ({
      id: user.id,
      label: user.name,
      hint: user.email,
    }))
  );

  readonly freePlayerOptions = computed(() =>
    this.freeParticipants().map((player) => ({
      id: player.userId,
      label: player.name,
    }))
  );

  readonly groupedTables = computed(() => {
    const matches = [...this.matches()].sort(
      (left, right) => left.roundNumber - right.roundNumber || left.matchNumber - right.matchNumber
    );
    const sections: Array<{ roundNumber: number; name: string; tables: MatchSummaryDto[] }> = [];
    for (const match of matches) {
      const current = sections.at(-1);
      if (!current || current.roundNumber !== match.roundNumber) {
        sections.push({ roundNumber: match.roundNumber, name: match.round, tables: [match] });
      } else {
        current.tables.push(match);
      }
    }
    return sections;
  });

  readonly allTablesSelected = computed(() => {
    const tables = this.matches();
    return tables.length > 0 && tables.every((match) => this.selectedTableIds().includes(match.id));
  });

  readonly canCreate = computed(() => {
    const selected = this.selectedPlayerIds();
    return selected.length >= 2 && selected.length <= this.maxTableSeats();
  });

  seatedSummary(): string {
    const names = this.seatedParticipants().map((player) => player.name);
    if (names.length === 1) {
      return `${names[0]} is already at a table.`;
    }
    if (names.length === 2) {
      return `${names[0]} and ${names[1]} are already at a table.`;
    }
    return `${names.slice(0, -1).join(', ')} and ${names.at(-1)} are already at a table.`;
  }

  seatedNames(): string {
    return this.seatedParticipants()
      .map((player) => player.name)
      .join(', ');
  }

  participantSeatLabel(userId: string): 'Pending' | 'In a match' | null {
    const status = this.playerMatchStatus().get(userId);
    if (!status) {
      return null;
    }
    if (status === MatchStatus.LIVE || status === MatchStatus.PAUSED) {
      return 'In a match';
    }
    return 'Pending';
  }

  tournamentName = '';
  tournamentGameType = GameType.LUDO;
  snakesLevelId = SnakesLevelId.CLASSIC;
  marriageDeckCount = 3;
  readonly marriageDeckOptions = [...MARRIAGE_DECK_OPTIONS];
  selectedBoardId = '';
  customLayout: SnakesBoardLayout = cloneSnakesLayout(resolveSnakesRules().layout);
  round = 'ROUND_1';
  roundNumber = 1;
  matchNumber = 1;

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  async select(tournament: TournamentDto): Promise<void> {
    this.selected.set(tournament);
    this.selectedPlayerIds.set([]);
    this.registerUserIds.set([]);
    this.selectedTableIds.set([]);
    await this.refreshSelected();
  }

  setCreateLevel(levelId: SnakesLevelId): void {
    this.snakesLevelId = levelId;
    this.selectedBoardId = '';
    if (levelId === SnakesLevelId.CUSTOM) {
      const first = this.customBoards()[0];
      if (first) {
        this.onSelectBoard(first.id);
      } else {
        this.customLayout = cloneSnakesLayout(resolveSnakesRules().layout);
      }
      return;
    }
    this.customLayout = cloneSnakesLayout(resolveSnakesRules({ levelId }).layout);
  }

  onSelectBoard(boardId: string): void {
    this.selectedBoardId = boardId;
    const board = this.customBoards().find((item) => item.id === boardId);
    this.customLayout = board
      ? cloneSnakesLayout(board.layout)
      : cloneSnakesLayout(resolveSnakesRules().layout);
  }

  async createTournament(): Promise<void> {
    const name = this.tournamentName.trim();
    if (!name) {
      this.error.set('Enter a tournament name.');
      return;
    }
    if (this.tournamentGameType === GameType.SNAKES && this.snakesLevelId === SnakesLevelId.CUSTOM) {
      if (!this.selectedBoardId) {
        this.error.set('Select a saved custom board, or create one under Custom boards.');
        return;
      }
    }
    await this.guard(async () => {
      const created = await this.api.createTournament(
        name,
        undefined,
        this.tournamentGameType,
        this.tournamentGameType === GameType.SNAKES ? this.snakesLevelId : undefined,
        this.tournamentGameType === GameType.SNAKES && this.snakesLevelId === SnakesLevelId.CUSTOM
          ? this.customLayout
          : undefined,
        this.tournamentGameType === GameType.MARRIAGE ? this.marriageDeckCount : undefined
      );
      this.tournamentName = '';
      this.tournamentGameType = GameType.LUDO;
      this.marriageDeckCount = 3;
      this.snakesLevelId = SnakesLevelId.CLASSIC;
      this.selectedBoardId = '';
      this.customLayout = cloneSnakesLayout(resolveSnakesRules().layout);
      await this.refresh();
      await this.select(created);
    });
  }

  async registerSelected(): Promise<void> {
    const tournament = this.selected();
    const userIds = this.registerUserIds();
    if (!tournament || userIds.length === 0) {
      return;
    }
    await this.guard(async () => {
      for (const userId of userIds) {
        await this.api.register(tournament.id, userId);
      }
      this.registerUserIds.set([]);
      await this.refreshSelected();
    });
  }

  async setStatus(status: TournamentStatus): Promise<void> {
    const tournament = this.selected();
    if (!tournament) {
      return;
    }
    await this.guard(async () => {
      const updated = await this.api.setTournamentStatus(tournament.id, status);
      this.selected.set(updated);
      await this.refresh();
    });
  }

  async createMatch(): Promise<void> {
    const tournament = this.selected();
    const playerUserIds = this.selectedPlayerIds();
    if (!tournament) {
      return;
    }
    const maxSeats = this.maxTableSeats();
    if (playerUserIds.length < 2 || playerUserIds.length > maxSeats) {
      this.error.set(`Select 2 to ${maxSeats} players to invite.`);
      return;
    }
    const busy = this.busyPlayerIds();
    if (playerUserIds.some((id) => busy.has(id))) {
      this.error.set('One or more selected players are already in an active match.');
      return;
    }
    await this.guard(async () => {
      await this.api.createMatch({
        tournamentId: tournament.id,
        round: this.round,
        roundNumber: this.roundNumber,
        playerUserIds,
      });
      this.selectedPlayerIds.set([]);
      await this.refreshSelected();
    });
  }

  maxTableSeats(): number {
    const tournament = this.selected();
    if (tournament?.gameType === GameType.MARRIAGE && isMarriageRules(tournament.rules)) {
      return maxMarriagePlayers(tournament.rules.deckCount);
    }
    return maxPlayersForGame(tournament?.gameType ?? GameType.LUDO);
  }

  maxSeatsForDecks(decks: number): number {
    return maxMarriagePlayers(decks);
  }

  async createRandomMatch(): Promise<void> {
    const tournament = this.selected();
    if (!tournament || this.grouping()) {
      return;
    }
    if (this.freeParticipants().length < 2) {
      this.error.set('Need at least 2 free players to form a group.');
      return;
    }
    this.grouping.set(true);
    try {
      await this.guard(async () => {
        await this.api.createMatchGroups({
          tournamentId: tournament.id,
          round: this.round,
          roundNumber: this.roundNumber,
        });
        this.selectedPlayerIds.set([]);
        await this.refreshSelected();
      });
    } finally {
      this.grouping.set(false);
    }
  }

  createGroups(): Promise<void> {
    return this.createRandomMatch();
  }

  groupLetter(match: MatchSummaryDto): string {
    const section = this.groupedTables().find((item) => item.roundNumber === match.roundNumber);
    const index = section?.tables.findIndex((item) => item.id === match.id) ?? 0;
    return String.fromCharCode(65 + Math.max(0, index));
  }

  onRoundChange(value: number): void {
    this.roundNumber = Number(value);
    const round = this.rounds().find((item) => item.number === this.roundNumber);
    this.round = round?.name ?? `ROUND_${this.roundNumber}`;
  }

  roundLabel(name: string): string {
    return name.replace(/_/g, ' ');
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date);
  }

  accentBar(status: TournamentStatus): string {
    switch (status) {
      case TournamentStatus.LIVE:
        return 'bg-piece-green';
      case TournamentStatus.REGISTRATION:
        return 'bg-piece-blue';
      case TournamentStatus.COMPLETED:
        return 'bg-arena-gold';
      case TournamentStatus.CANCELLED:
        return 'bg-piece-red';
      default:
        return 'bg-arena-line';
    }
  }

  async assignRandom(matchId: string): Promise<void> {
    await this.guard(async () => {
      await this.api.assignRandom(matchId);
      await this.refreshSelected();
    });
  }

  isTableSelected(matchId: string): boolean {
    return this.selectedTableIds().includes(matchId);
  }

  toggleTable(matchId: string): void {
    this.selectedTableIds.update((ids) =>
      ids.includes(matchId) ? ids.filter((id) => id !== matchId) : [...ids, matchId]
    );
  }

  toggleSelectAllTables(): void {
    if (this.allTablesSelected()) {
      this.selectedTableIds.set([]);
      return;
    }
    this.selectedTableIds.set(this.matches().map((match) => match.id));
  }

  async runBulk(action: BulkMatchAction): Promise<void> {
    const matchIds = this.selectedTableIds();
    if (!matchIds.length) {
      return;
    }
    if (action === 'cancel' && !window.confirm(`Cancel ${matchIds.length} selected table(s)?`)) {
      return;
    }
    if (action === 'delete' && !window.confirm(`Delete ${matchIds.length} selected table(s)? This cannot be undone.`)) {
      return;
    }
    this.bulkBusy.set(true);
    try {
      await this.guard(async () => {
        const result = await this.api.bulkMatches(action, matchIds);
        this.selectedTableIds.update((ids) => ids.filter((id) => !result.ok.includes(id)));
        await this.refreshSelected();
        if (result.failed.length) {
          throw new Error(result.failed.map((row) => row.reason).join(' · '));
        }
      });
    } finally {
      this.bulkBusy.set(false);
    }
  }

  async remove(match: MatchSummaryDto): Promise<void> {
    if (!window.confirm(`Delete match ${match.matchNumber}? This cannot be undone.`)) {
      return;
    }
    await this.guard(async () => {
      await this.api.deleteMatch(match.id);
      await this.refreshSelected();
    });
  }

  async removeTournament(tournament: TournamentDto, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm(`Delete ${tournament.name}? This also removes its tables and cannot be undone.`)) {
      return;
    }
    await this.guard(async () => {
      await this.api.deleteTournament(tournament.id);
      if (this.selected()?.id === tournament.id) {
        this.selected.set(null);
        this.participants.set([]);
        this.matches.set([]);
        this.selectedPlayerIds.set([]);
      }
      const [tournaments, users] = await Promise.all([this.api.tournaments(), this.api.users()]);
      this.tournaments.set(tournaments);
      this.users.set(users);
      if (!this.selected() && tournaments[0]) {
        await this.select(tournaments[0]);
      }
    });
  }

  async advance(): Promise<void> {
    const tournament = this.selected();
    if (!tournament) {
      return;
    }
    await this.guard(async () => {
      await this.api.advance(tournament.id, this.roundNumber);
      await this.refreshSelected();
    });
  }

  private async refresh(): Promise<void> {
    await this.guard(async () => {
      const [tournaments, users, boards] = await Promise.all([
        this.api.tournaments(),
        this.api.users(),
        this.api.snakesBoards(),
      ]);
      this.tournaments.set(tournaments);
      this.users.set(users);
      this.customBoards.set(boards);
      if (!this.selected() && tournaments[0]) {
        await this.select(tournaments[0]);
      }
    });
  }

  private async refreshSelected(): Promise<void> {
    const tournament = this.selected();
    if (!tournament) {
      return;
    }
    const [participants, matches] = await Promise.all([
      this.api.participants(tournament.id),
      this.api.matches({ tournamentId: tournament.id }),
    ]);
    this.participants.set(participants);
    this.matches.set(matches);
    this.tournaments.update((rows) =>
      rows.map((row) =>
        row.id === tournament.id
          ? { ...row, playerCount: participants.length, tableCount: matches.length }
          : row
      )
    );
    this.selected.update((current) =>
      current?.id === tournament.id
        ? { ...current, playerCount: participants.length, tableCount: matches.length }
        : current
    );
    const last = matches.at(-1);
    if (last) {
      this.matchNumber = last.matchNumber + 1;
      this.roundNumber = last.roundNumber;
      this.round = last.round;
    }
    const freeIds = participants
      .filter((player) => !this.busyPlayerIds().has(player.userId))
      .slice(0, this.maxTableSeats())
      .map((player) => player.userId);
    if (freeIds.length >= 2 && this.selectedPlayerIds().length === 0) {
      this.selectedPlayerIds.set(freeIds);
    }
  }

  private async guard(task: () => Promise<void>): Promise<void> {
    this.error.set(null);
    try {
      await task();
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }
}
