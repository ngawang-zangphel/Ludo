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
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="font-display text-lg">Group tables</h2>
                <p class="mt-1 text-sm text-arena-mist/70">
                  One tournament can run many groups at once. Each group of 2–4 players gets its own table.
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
              @for (section of groupedTables(); track section.roundNumber) {
                <div>
                  <p class="text-xs uppercase tracking-[0.2em] text-arena-gold">
                    {{ roundLabel(section.name) }}
                  </p>
                  <div class="mt-2 grid gap-3 sm:grid-cols-2">
                    @for (match of section.tables; track match.id) {
                      <article class="rounded-2xl border border-arena-line p-4">
                        <div class="flex items-start justify-between gap-2">
                          <div>
                            <p class="text-xs uppercase tracking-wider text-arena-mist/50">
                              Group {{ groupLetter(match) }}
                            </p>
                            <p class="mt-1 font-display text-white">{{ playerNames(match) }}</p>
                            <p class="mt-1 text-xs text-arena-mist/60">Invitation sent — waiting for players to join.</p>
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
                  {{ selectedPlayerIds().length }} selected · tap 2–4 names for one group, or split everyone.
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  @for (player of freeParticipants(); track player.userId) {
                    <button
                      type="button"
                      class="rounded-full border px-3 py-1.5 text-sm"
                      [class.border-arena-gold]="isSelected(player.userId)"
                      [class.bg-arena-gold]="isSelected(player.userId)"
                      [class.text-arena-ink]="isSelected(player.userId)"
                      [class.border-arena-line]="!isSelected(player.userId)"
                      (click)="togglePlayer(player.userId)"
                    >
                      {{ player.name }}
                    </button>
                  }
                </div>
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
                    class="rounded-full border border-arena-gold px-4 py-2 text-sm text-arena-gold"
                    (click)="createGroups()"
                  >
                    Split everyone into groups
                  </button>
                </div>
                @if (leftoverCount() === 1) {
                  <p class="mt-3 text-xs text-arena-mist/50">
                    One player will wait — a group needs at least 2 people.
                  </p>
                }
              } @else if (seatedParticipants().length) {
                <p class="mt-2 rounded-2xl bg-black/20 px-4 py-3 text-sm text-arena-mist/70">
                  {{ seatedSummary() }} Add another player, or delete a table to free seats.
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
  readonly selected = signal<TournamentDto | null>(null);
  readonly participants = signal<ParticipantDto[]>([]);
  readonly matches = signal<MatchSummaryDto[]>([]);
  readonly users = signal<UserDto[]>([]);
  readonly error = signal<string | null>(null);
  readonly playerNames = playerNames;
  readonly selectedPlayerIds = signal<string[]>([]);

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

  readonly freeParticipants = computed(() =>
    this.participants().filter((player) => !this.busyPlayerIds().has(player.userId))
  );

  readonly seatedParticipants = computed(() =>
    this.participants().filter((player) => this.busyPlayerIds().has(player.userId))
  );

  readonly leftoverCount = computed(() => (this.freeParticipants().length === 1 ? 1 : 0));

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

  readonly canCreate = computed(() => {
    const selected = this.selectedPlayerIds();
    return selected.length >= 2 && selected.length <= 4;
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
    const tournament = this.selected();
    if (!tournament) {
      return;
    }
    if (this.freeParticipants().length < 2) {
      this.error.set('Need at least 2 free players to form a group.');
      return;
    }
    await this.guard(async () => {
      await this.api.createMatchGroups({
        tournamentId: tournament.id,
        round: this.round,
        roundNumber: this.roundNumber,
      });
      this.selectedPlayerIds.set([]);
      await this.refreshSelected();
    });
  }

  createGroups(): Promise<void> {
    return this.createRandomMatch();
  }

  groupLetter(match: MatchSummaryDto): string {
    const section = this.groupedTables().find((item) => item.roundNumber === match.roundNumber);
    const index = section?.tables.findIndex((item) => item.id === match.id) ?? 0;
    return String.fromCharCode(65 + Math.max(0, index));
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
      .slice(0, 4)
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
