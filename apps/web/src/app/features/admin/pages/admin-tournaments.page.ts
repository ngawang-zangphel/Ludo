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
  MatchStatus,
  MatchSummaryDto,
  ParticipantDto,
  TournamentDto,
  TournamentStatus,
  UserDto,
  UserRole,
} from '@ludo-game/shared-types';
import { ArenaApiService } from '../../../core/api/arena-api.service';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge';
import { httpErrorMessage, playerNames } from '../../../shared/format';

@Component({
  selector: 'ludo-admin-tournaments-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="mx-auto max-w-6xl px-4 py-8">
      <a routerLink="/admin" class="text-xs uppercase tracking-[0.3em] text-arena-gold hover:underline">Dashboard</a>
      <h1 class="mt-2 font-display text-3xl font-bold text-white">Tournaments</h1>

      @if (error()) {
        <p class="mt-4 text-piece-red">{{ error() }}</p>
      }

      <section class="mt-6 grid gap-4 lg:grid-cols-2">
        <form class="rounded-3xl border border-arena-line bg-arena-navy/80 p-5" (ngSubmit)="createTournament()">
          <h2 class="font-display text-lg">New tournament</h2>
          <input
            class="mt-3 w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2"
            name="tournamentName"
            placeholder="Tournament name"
            [(ngModel)]="tournamentName"
            required
          />
          <button class="mt-3 rounded-full bg-arena-gold px-4 py-2 text-sm font-semibold text-arena-ink" type="submit">
            Create
          </button>
        </form>
        <form class="rounded-3xl border border-arena-line bg-arena-navy/80 p-5" (ngSubmit)="createPlayer()">
          <h2 class="font-display text-lg">New player</h2>
          <div class="mt-3 grid gap-2 sm:grid-cols-3">
            <input class="field" name="playerName" placeholder="Name" [(ngModel)]="playerName" required />
            <input class="field" name="playerEmail" type="email" placeholder="Email" [(ngModel)]="playerEmail" required />
            <input class="field" name="playerPassword" placeholder="Password" [(ngModel)]="playerPassword" required />
          </div>
          <button class="mt-3 rounded-full border border-arena-gold px-4 py-2 text-sm text-arena-gold" type="submit">
            Create player
          </button>
        </form>
      </section>

      <section class="mt-8 grid gap-3">
        @for (tournament of tournaments(); track tournament.id) {
          <button
            type="button"
            class="rounded-2xl border px-4 py-3 text-left"
            [class.border-arena-gold]="selected()?.id === tournament.id"
            [class.border-arena-line]="selected()?.id !== tournament.id"
            (click)="select(tournament)"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="font-display text-lg">{{ tournament.name }}</span>
              <ludo-status-badge [status]="tournament.status" />
            </div>
          </button>
        }
      </section>

      @if (selected(); as tournament) {
        <section class="mt-8 grid gap-6 lg:grid-cols-2">
          <div class="rounded-3xl border border-arena-line bg-arena-navy/80 p-5">
            <div class="flex items-center justify-between">
              <h2 class="font-display text-lg">Participants</h2>
              <select
                class="field max-w-[11rem]"
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
                <li>{{ participant.seed }}. {{ participant.name }} · {{ participant.status }}</li>
              }
            </ul>
            <form class="mt-4 flex gap-2" (ngSubmit)="register()">
              <select class="field flex-1" name="registerUserId" [(ngModel)]="registerUserId">
                <option value="">Register a player</option>
                @for (user of users(); track user.id) {
                  @if (user.role === 'PLAYER') {
                    <option [value]="user.id">{{ user.name }}</option>
                  }
                }
              </select>
              <button class="rounded-full bg-arena-gold px-4 py-2 text-sm font-semibold text-arena-ink" type="submit">
                Add
              </button>
            </form>
          </div>

          <div class="rounded-3xl border border-arena-line bg-arena-navy/80 p-5">
            <h2 class="font-display text-lg">Create a match</h2>
            <p class="mt-1 text-sm text-arena-mist/70">
              Pick 2–4 players. They will get an invitation to join.
            </p>

            @if (rounds().length) {
              <label class="mt-4 block text-sm">
                Round
                <select
                  class="field mt-1 w-full"
                  name="roundNumber"
                  [ngModel]="roundNumber"
                  (ngModelChange)="onRoundChange($event)"
                >
                  @for (round of rounds(); track round.number) {
                    <option [ngValue]="round.number">{{ roundLabel(round.name) }}</option>
                  }
                </select>
              </label>
            }

            <p class="mt-4 text-xs uppercase tracking-wider text-arena-mist/50">
              Players · {{ selectedPlayerIds().length }} / 4 selected
            </p>
            <div class="mt-2 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              @for (user of playerAccounts(); track user.id) {
                <label
                  class="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                  [class.border-arena-gold]="isSelected(user.id)"
                  [class.bg-arena-gold/10]="isSelected(user.id)"
                  [class.border-arena-line]="!isSelected(user.id)"
                >
                  <input
                    type="checkbox"
                    class="accent-yellow-500"
                    [checked]="isSelected(user.id)"
                    (change)="togglePlayer(user.id)"
                  />
                  <span class="min-w-0 flex-1 truncate">{{ user.name }}</span>
                  @if (busyPlayerIds().has(user.id)) {
                    <span class="text-[10px] uppercase tracking-wider text-arena-mist/40">Busy</span>
                  }
                </label>
              } @empty {
                <p class="text-sm text-arena-mist/60">Create a player first, then invite them here.</p>
              }
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-full bg-arena-gold px-4 py-2 text-sm font-semibold text-arena-ink disabled:opacity-40"
                [disabled]="selectedPlayerIds().length < 2 || selectedPlayerIds().length > 4"
                (click)="createMatch()"
              >
                Create match & invite
              </button>
              <button
                type="button"
                class="rounded-full border border-arena-gold px-4 py-2 text-sm text-arena-gold"
                (click)="createRandomMatch()"
              >
                Pick 4 at random
              </button>
            </div>
            <p class="mt-2 text-xs text-arena-mist/50">Players will see this as an invitation to join.</p>
            <button type="button" class="mt-3 text-xs text-arena-mist/60 hover:text-arena-gold" (click)="advance()">
              Advance {{ roundLabel(round) }}
            </button>

            <div class="mt-5 space-y-3">
              @for (match of matches(); track match.id) {
                <article class="rounded-2xl border border-arena-line p-3">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm">Match {{ match.matchNumber }} · {{ playerNames(match) }}</p>
                    <ludo-status-badge [status]="match.status" />
                  </div>
                  <div class="mt-2 flex flex-wrap gap-2">
                    @if (!match.players.length) {
                      <button type="button" class="text-xs text-arena-gold" (click)="assignRandom(match.id)">
                        Seat random players
                      </button>
                    }
                    <a class="text-xs text-arena-mist/80" [routerLink]="['/admin/matches', match.id]">Watch</a>
                    <button type="button" class="text-xs text-piece-red" (click)="remove(match)">Delete</button>
                  </div>
                </article>
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
  readonly selected = signal<TournamentDto | null>(null);
  readonly participants = signal<ParticipantDto[]>([]);
  readonly matches = signal<MatchSummaryDto[]>([]);
  readonly users = signal<UserDto[]>([]);
  readonly error = signal<string | null>(null);
  readonly playerNames = playerNames;
  readonly selectedPlayerIds = signal<string[]>([]);

  readonly playerAccounts = computed(() =>
    this.users().filter((user) => user.role === UserRole.PLAYER)
  );

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

  tournamentName = '';
  playerName = '';
  playerEmail = '';
  playerPassword = 'Player123!';
  registerUserId = '';
  round = 'ROUND_1';
  roundNumber = 1;
  matchNumber = 1;

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  async select(tournament: TournamentDto): Promise<void> {
    this.selected.set(tournament);
    this.selectedPlayerIds.set([]);
    await this.refreshSelected();
  }

  async createTournament(): Promise<void> {
    await this.guard(async () => {
      const created = await this.api.createTournament(this.tournamentName);
      this.tournamentName = '';
      await this.refresh();
      await this.select(created);
    });
  }

  async createPlayer(): Promise<void> {
    await this.guard(async () => {
      await this.api.createUser({
        email: this.playerEmail,
        name: this.playerName,
        password: this.playerPassword,
      });
      this.playerName = '';
      this.playerEmail = '';
      this.users.set(await this.api.users());
    });
  }

  async register(): Promise<void> {
    const tournament = this.selected();
    if (!tournament || !this.registerUserId) {
      return;
    }
    await this.guard(async () => {
      await this.api.register(tournament.id, this.registerUserId);
      this.registerUserId = '';
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
    if (playerUserIds.length < 2 || playerUserIds.length > 4) {
      this.error.set('Select 2 to 4 players to invite.');
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

  async createRandomMatch(): Promise<void> {
    const free = this.playerAccounts().filter((user) => !this.busyPlayerIds().has(user.id));
    const shuffled = [...free].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(4, shuffled.length));
    if (picked.length < 2) {
      this.error.set('Need at least 2 available players.');
      return;
    }
    this.selectedPlayerIds.set(picked.map((user) => user.id));
    await this.createMatch();
  }

  isSelected(userId: string): boolean {
    return this.selectedPlayerIds().includes(userId);
  }

  togglePlayer(userId: string): void {
    this.selectedPlayerIds.update((ids) => {
      if (ids.includes(userId)) {
        return ids.filter((id) => id !== userId);
      }
      if (ids.length >= 4) {
        return ids;
      }
      return [...ids, userId];
    });
  }

  onRoundChange(value: number): void {
    this.roundNumber = Number(value);
    const round = this.rounds().find((item) => item.number === this.roundNumber);
    this.round = round?.name ?? `ROUND_${this.roundNumber}`;
  }

  roundLabel(name: string): string {
    return name.replace(/_/g, ' ');
  }

  async assignRandom(matchId: string): Promise<void> {
    await this.guard(async () => {
      await this.api.assignRandom(matchId);
      await this.refreshSelected();
    });
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
      const [tournaments, users] = await Promise.all([this.api.tournaments(), this.api.users()]);
      this.tournaments.set(tournaments);
      this.users.set(users);
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
    const last = matches.at(-1);
    if (last) {
      this.matchNumber = last.matchNumber + 1;
      this.roundNumber = last.roundNumber;
      this.round = last.round;
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
