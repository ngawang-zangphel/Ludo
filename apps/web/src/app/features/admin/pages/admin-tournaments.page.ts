import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
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
                  <option [value]="user.id">{{ user.name }}</option>
                }
              </select>
              <button class="rounded-full bg-arena-gold px-4 py-2 text-sm font-semibold text-arena-ink" type="submit">
                Add
              </button>
            </form>
          </div>

          <div class="rounded-3xl border border-arena-line bg-arena-navy/80 p-5">
            <h2 class="font-display text-lg">Matches</h2>
            <form class="mt-3 grid gap-2 sm:grid-cols-3" (ngSubmit)="createMatch()">
              <input class="field" name="round" placeholder="ROUND_1" [(ngModel)]="round" required />
              <input class="field" name="roundNumber" type="number" min="1" [(ngModel)]="roundNumber" />
              <input class="field" name="matchNumber" type="number" min="1" [(ngModel)]="matchNumber" />
              <button class="rounded-full border border-arena-line px-4 py-2 text-sm sm:col-span-2" type="submit">
                Create empty match
              </button>
              <button
                class="rounded-full border border-arena-gold px-4 py-2 text-sm text-arena-gold"
                type="button"
                (click)="advance()"
              >
                Advance round {{ roundNumber }}
              </button>
            </form>
            <div class="mt-4 space-y-3">
              @for (match of matches(); track match.id) {
                <article class="rounded-2xl border border-arena-line p-3">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm">Match {{ match.matchNumber }} · {{ playerNames(match) }}</p>
                    <ludo-status-badge [status]="match.status" />
                  </div>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button type="button" class="text-xs text-arena-gold" (click)="assignRandom(match.id)">
                      Random assign
                    </button>
                    <a class="text-xs text-arena-mist/80" [routerLink]="['/admin/matches', match.id]">Watch</a>
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
    if (!tournament) {
      return;
    }
    await this.guard(async () => {
      await this.api.createMatch({
        tournamentId: tournament.id,
        round: this.round,
        roundNumber: this.roundNumber,
        matchNumber: this.matchNumber,
      });
      this.matchNumber += 1;
      await this.refreshSelected();
    });
  }

  async assignRandom(matchId: string): Promise<void> {
    await this.guard(async () => {
      await this.api.assignRandom(matchId);
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
