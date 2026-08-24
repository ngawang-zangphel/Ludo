import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameType, UserRole } from '@ludo-game/shared-types';
import { UsersService } from '../users/users.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { MatchesService } from '../matches/matches.service';
import { logEvent } from '../common/logger';

const PLAYERS = [
  { email: 'karma@ludo.arena', name: 'Karma' },
  { email: 'pema@ludo.arena', name: 'Pema' },
  { email: 'sonam@ludo.arena', name: 'Sonam' },
  { email: 'tashi@ludo.arena', name: 'Tashi' },
  { email: 'jigme@ludo.arena', name: 'Jigme' },
  { email: 'ugyen@ludo.arena', name: 'Ugyen' },
  { email: 'dechen@ludo.arena', name: 'Dechen' },
  { email: 'kinley@ludo.arena', name: 'Kinley' },
];

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly tournaments: TournamentsService,
    private readonly matches: MatchesService
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get('SEED_ON_BOOT', 'true') !== 'true') {
      return;
    }
    const existing = await this.users.findByEmail('admin@ludo.arena');
    if (existing) {
      return;
    }

    await this.users.create({
      email: 'admin@ludo.arena',
      name: 'Arena Admin',
      password: 'Admin123!',
      role: UserRole.ADMIN,
    });

    const players = [];
    for (const player of PLAYERS) {
      players.push(
        await this.users.create({
          email: player.email,
          name: player.name,
          password: 'Player123!',
          role: UserRole.PLAYER,
        })
      );
    }

    const tournament = await this.tournaments.create({
      name: 'SELISE Ludo Tournament 2026',
      rounds: [
        { name: 'ROUND_1', number: 1 },
        { name: 'SEMI_FINAL', number: 2 },
        { name: 'FINAL', number: 3 },
      ],
    });

    for (const player of players) {
      await this.tournaments.register(tournament.id, { userId: player.id });
    }

    await this.matches.create({
      tournamentId: tournament.id,
      round: 'ROUND_1',
      roundNumber: 1,
      matchNumber: 1,
      playerUserIds: players.slice(0, 4).map((player) => player.id),
    });
    await this.matches.create({
      tournamentId: tournament.id,
      round: 'ROUND_1',
      roundNumber: 1,
      matchNumber: 2,
      playerUserIds: players.slice(4, 8).map((player) => player.id),
    });

    const snakes = await this.tournaments.create({
      name: 'SELISE Snakes & Ladders 2026',
      gameType: GameType.SNAKES,
      rounds: [
        { name: 'ROUND_1', number: 1 },
        { name: 'SEMI_FINAL', number: 2 },
        { name: 'FINAL', number: 3 },
      ],
    });
    for (const player of players.slice(0, 4)) {
      await this.tournaments.register(snakes.id, { userId: player.id });
    }
    await this.matches.create({
      tournamentId: snakes.id,
      round: 'ROUND_1',
      roundNumber: 1,
      matchNumber: 1,
      playerUserIds: players.slice(0, 4).map((player) => player.id),
    });

    logEvent('Tournament created', { tournamentId: tournament.id, seeded: true });
    logEvent('Tournament created', { tournamentId: snakes.id, seeded: true, gameType: GameType.SNAKES });
  }
}
