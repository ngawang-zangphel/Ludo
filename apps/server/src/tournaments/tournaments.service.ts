import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DEFAULT_DISCONNECT_RULES,
  DEFAULT_LUDO_RULES,
  GameType,
  isSnakesRules,
  ParticipantDto,
  ParticipantStatus,
  resolveMarriageRules,
  resolveSnakesRules,
  TournamentDto,
  TournamentStatus,
  validateSnakesLayout,
} from '@ludo-game/shared-types';
import { Tournament, TournamentDocument } from './schemas/tournament.schema';
import {
  TournamentParticipant,
  TournamentParticipantDocument,
} from './schemas/participant.schema';
import { CreateTournamentDto, RegisterParticipantDto } from './dto/tournament.dto';
import { UsersService } from '../users/users.service';
import { toObjectIdString } from '../common/types';
import { logEvent } from '../common/logger';
import { MatchesService } from '../matches/matches.service';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectModel(Tournament.name) private readonly tournaments: Model<TournamentDocument>,
    @InjectModel(TournamentParticipant.name)
    private readonly participants: Model<TournamentParticipantDocument>,
    private readonly users: UsersService,
    private readonly matches: MatchesService
  ) {}

  async create(dto: CreateTournamentDto): Promise<TournamentDto> {
    const gameType =
      dto.gameType === GameType.SNAKES
        ? GameType.SNAKES
        : dto.gameType === GameType.MARRIAGE
          ? GameType.MARRIAGE
          : GameType.LUDO;
    const rules =
      gameType === GameType.SNAKES
        ? resolveSnakesRules({
            levelId: dto.snakesLevelId,
            layout: dto.snakesLayout,
          })
        : gameType === GameType.MARRIAGE
          ? resolveMarriageRules({
              deckCount: dto.marriageDeckCount,
              allowDubleeWin: false,
            })
          : DEFAULT_LUDO_RULES;
    if (gameType === GameType.SNAKES && isSnakesRules(rules)) {
      const layoutError = validateSnakesLayout(rules.layout);
      if (layoutError) {
        throw new BadRequestException(layoutError);
      }
    }
    const tournament = await this.tournaments.create({
      name: dto.name,
      status: TournamentStatus.REGISTRATION,
      gameType,
      rules,
      disconnectRules: DEFAULT_DISCONNECT_RULES,
      rounds: dto.rounds ?? [
        { name: 'ROUND_1', number: 1 },
        { name: 'SEMI_FINAL', number: 2 },
        { name: 'FINAL', number: 3 },
      ],
    });
    logEvent('Tournament created', { tournamentId: toObjectIdString(tournament._id), name: dto.name });
    return this.toDto(tournament, { playerCount: 0, tableCount: 0 });
  }

  async list(): Promise<TournamentDto[]> {
    const rows = await this.tournaments.find().sort({ createdAt: -1 }).exec();
    const ids = rows.map((row) => row._id);
    const [playerRows, tableCounts] = await Promise.all([
      this.participants
        .aggregate<{ _id: Types.ObjectId; count: number }>([
          { $match: { tournamentId: { $in: ids } } },
          { $group: { _id: '$tournamentId', count: { $sum: 1 } } },
        ])
        .exec(),
      this.matches.countByTournamentIds(ids.map((id) => toObjectIdString(id))),
    ]);
    const playerCounts = new Map(
      playerRows.map((row) => [toObjectIdString(row._id), row.count] as const)
    );
    return rows.map((row) => {
      const id = toObjectIdString(row._id);
      return this.toDto(row, {
        playerCount: playerCounts.get(id) ?? 0,
        tableCount: tableCounts.get(id) ?? 0,
      });
    });
  }

  async get(id: string): Promise<TournamentDto> {
    return this.withCounts(await this.require(id));
  }

  async setStatus(id: string, status: TournamentStatus): Promise<TournamentDto> {
    const tournament = await this.require(id);
    tournament.status = status;
    await tournament.save();
    return this.withCounts(tournament);
  }

  async register(tournamentId: string, dto: RegisterParticipantDto): Promise<ParticipantDto> {
    const tournament = await this.require(tournamentId);
    const user = await this.users.findById(dto.userId);
    const count = await this.participants.countDocuments({ tournamentId: tournament._id });
    const participant = await this.participants.create({
      tournamentId: tournament._id,
      userId: user._id,
      seed: count + 1,
      status: ParticipantStatus.REGISTERED,
    });
    return {
      id: toObjectIdString(participant._id),
      tournamentId,
      userId: toObjectIdString(user._id),
      name: user.name,
      email: user.email,
      seed: participant.seed,
      status: participant.status,
    };
  }

  async listParticipants(tournamentId: string): Promise<ParticipantDto[]> {
    const rows = await this.participants.find({ tournamentId: new Types.ObjectId(tournamentId) }).exec();
    const result: ParticipantDto[] = [];
    for (const row of rows) {
      const user = await this.users.findById(toObjectIdString(row.userId));
      result.push({
        id: toObjectIdString(row._id),
        tournamentId,
        userId: toObjectIdString(user._id),
        name: user.name,
        email: user.email,
        seed: row.seed,
        status: row.status,
        finalRank: row.finalRank,
      });
    }
    return result.sort((a, b) => a.seed - b.seed);
  }

  async advance(tournamentId: string, fromRoundNumber: number): Promise<void> {
    const tournament = await this.require(tournamentId);
    const round = tournament.rounds.find((item) => item.number === fromRoundNumber);
    const nextRound = tournament.rounds.find((item) => item.number === fromRoundNumber + 1);
    if (!round) {
      throw new BadRequestException('Round not found');
    }
    const matches = await this.matches.list({ tournamentId });
    const completed = matches.filter(
      (match) => match.roundNumber === fromRoundNumber && match.status === 'COMPLETED'
    );
    const winners = completed
      .map((match) => match.winnerIds[0])
      .filter((id): id is string => Boolean(id));
    if (winners.length === 0) {
      throw new BadRequestException('No winners to advance');
    }
    if (!nextRound || winners.length === 1) {
      tournament.status = TournamentStatus.COMPLETED;
      await tournament.save();
      const winnerId = winners[0];
      if (winnerId) {
        await this.participants.findOneAndUpdate(
          { tournamentId: tournament._id, userId: new Types.ObjectId(winnerId) },
          { status: ParticipantStatus.WINNER, finalRank: 1 }
        );
      }
      return;
    }

    const existing = matches.filter((match) => match.roundNumber === nextRound.number);
    let matchNumber =
      matches.reduce((max, match) => Math.max(max, match.matchNumber), 0) + 1;
    for (let index = 0; index < winners.length; index += 4) {
      const group = winners.slice(index, index + 4);
      if (group.length < 2) {
        break;
      }
      if (existing.some((match) => match.players.some((player) => group.includes(player.userId)))) {
        continue;
      }
      await this.matches.create({
        tournamentId,
        round: nextRound.name,
        roundNumber: nextRound.number,
        matchNumber,
        playerUserIds: group,
      });
      matchNumber += 1;
    }
    tournament.status = TournamentStatus.LIVE;
    await tournament.save();
  }

  async remove(id: string): Promise<{ ok: true }> {
    const tournament = await this.require(id);
    await this.matches.removeByTournamentId(id);
    await this.participants.deleteMany({ tournamentId: tournament._id }).exec();
    await this.tournaments.deleteOne({ _id: tournament._id }).exec();
    logEvent('Tournament deleted', { tournamentId: id, name: tournament.name });
    return { ok: true };
  }

  private async require(id: string): Promise<TournamentDocument> {
    const tournament = await this.tournaments.findById(id).exec();
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    return tournament;
  }

  private async withCounts(tournament: TournamentDocument): Promise<TournamentDto> {
    const id = toObjectIdString(tournament._id);
    const [playerCount, tableCounts] = await Promise.all([
      this.participants.countDocuments({ tournamentId: tournament._id }),
      this.matches.countByTournamentIds([id]),
    ]);
    return this.toDto(tournament, {
      playerCount,
      tableCount: tableCounts.get(id) ?? 0,
    });
  }

  private toDto(
    tournament: TournamentDocument,
    counts: { playerCount: number; tableCount: number }
  ): TournamentDto {
    return {
      id: toObjectIdString(tournament._id),
      name: tournament.name,
      status: tournament.status,
      gameType: tournament.gameType ?? GameType.LUDO,
      rules: tournament.rules,
      disconnectRules: tournament.disconnectRules,
      rounds: tournament.rounds,
      playerCount: counts.playerCount,
      tableCount: counts.tableCount,
      createdAt: tournament.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: tournament.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
