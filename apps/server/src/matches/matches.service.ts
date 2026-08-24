import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  GameEventType,
  GameState,
  MatchDetailDto,
  MatchResultDto,
  MatchStatus,
  MatchSummaryDto,
  ParticipantStatus,
  PLAYER_COLOR_ORDER,
  ServerToClientEvents,
} from '@ludo-game/shared-types';
import { applyDiceRoll, applyMove, createMatchState } from '@ludo-game/game-engine';
import { Match, MatchDocument } from './schemas/match.schema';
import { MatchResult, MatchResultDocument } from './schemas/match-result.schema';
import { MatchEvent, MatchEventDocument } from './schemas/match-event.schema';
import { Tournament, TournamentDocument } from '../tournaments/schemas/tournament.schema';
import {
  TournamentParticipant,
  TournamentParticipantDocument,
} from '../tournaments/schemas/participant.schema';
import { UsersService } from '../users/users.service';
import { MatchStateService } from './match-state.service';
import { MatchCommandQueue } from './match-command-queue.service';
import { toDetail, toSummary } from './match-mapper';
import { AssignPlayersDto, CreateMatchDto } from './dto/match.dto';
import { toObjectIdString } from '../common/types';
import { logEvent } from '../common/logger';
import { RealtimeService } from '../realtime/realtime.service';
import { BroadcastService } from '../broadcast/broadcast.service';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private readonly matches: Model<MatchDocument>,
    @InjectModel(MatchResult.name) private readonly results: Model<MatchResultDocument>,
    @InjectModel(MatchEvent.name) private readonly events: Model<MatchEventDocument>,
    @InjectModel(Tournament.name) private readonly tournaments: Model<TournamentDocument>,
    @InjectModel(TournamentParticipant.name)
    private readonly participants: Model<TournamentParticipantDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly users: UsersService,
    private readonly state: MatchStateService,
    private readonly queue: MatchCommandQueue,
    private readonly realtime: RealtimeService,
    private readonly broadcast: BroadcastService
  ) {}

  enqueue<T>(matchId: string, task: () => Promise<T>): Promise<T> {
    return this.queue.enqueue(matchId, task);
  }

  async create(dto: CreateMatchDto): Promise<MatchDetailDto> {
    const tournament = await this.requireTournament(dto.tournamentId);
    const previous = await this.matches
      .findOne({ tournamentId: tournament._id })
      .sort({ matchNumber: -1 })
      .exec();
    const roundNumber = dto.roundNumber ?? previous?.roundNumber ?? 1;
    const matchNumber = dto.matchNumber ?? (previous ? previous.matchNumber + 1 : 1);
    const round =
      dto.round?.trim() ||
      tournament.rounds.find((item) => item.number === roundNumber)?.name ||
      `Round ${roundNumber}`;

    const match = await this.matches.create({
      tournamentId: tournament._id,
      round,
      roundNumber,
      matchNumber,
      status: MatchStatus.WAITING,
      players: [],
    });
    logEvent('Match created', {
      matchId: toObjectIdString(match._id),
      tournamentId: dto.tournamentId,
      matchNumber,
    });

    const matchId = toObjectIdString(match._id);
    if (dto.playerUserIds?.length) {
      await this.ensureParticipants(tournament._id, dto.playerUserIds);
      return this.assignPlayers(matchId, { playerUserIds: dto.playerUserIds });
    }
    if (dto.random) {
      return this.assignRandom(matchId);
    }
    return this.toDetailDto(match);
  }

  async assignPlayers(matchId: string, dto: AssignPlayersDto): Promise<MatchDetailDto> {
    if (dto.playerUserIds.length < 2 || dto.playerUserIds.length > 4) {
      throw new BadRequestException('A match needs 2 to 4 players');
    }
    const match = await this.state.loadMatch(matchId);
    if (match.status === MatchStatus.LIVE) {
      throw new BadRequestException('Cannot reassign a live match');
    }
    const colors = [...PLAYER_COLOR_ORDER];
    const players = [];
    for (let index = 0; index < dto.playerUserIds.length; index += 1) {
      const userId = dto.playerUserIds[index];
      if (!userId) {
        continue;
      }
      const user = await this.users.findById(userId);
      const color = colors[index];
      if (!color) {
        throw new BadRequestException('Too many players');
      }
      players.push({
        userId: user._id,
        name: user.name,
        color,
      });
    }
    match.players = players;
    match.status = players.length >= 2 ? MatchStatus.READY : MatchStatus.WAITING;
    await this.state.persistMatch(match);
    await this.publishAdmin();
    return this.toDetailDto(match);
  }

  async assignRandom(matchId: string): Promise<MatchDetailDto> {
    const match = await this.state.loadMatch(matchId);
    const assigned = new Set(
      (
        await this.matches
          .find({
            tournamentId: match.tournamentId,
            status: { $nin: [MatchStatus.CANCELLED] },
          })
          .exec()
      ).flatMap((item) => item.players.map((player) => toObjectIdString(player.userId)))
    );
    const available = await this.participants.find({ tournamentId: match.tournamentId }).exec();
    const unused = available.filter((participant) => !assigned.has(toObjectIdString(participant.userId)));
    shuffle(unused);
    const picked = unused.slice(0, 4).map((participant) => toObjectIdString(participant.userId));
    if (picked.length < 2) {
      throw new BadRequestException('Not enough unassigned players');
    }
    return this.assignPlayers(matchId, { playerUserIds: picked });
  }

  async start(matchId: string): Promise<MatchDetailDto> {
    return this.enqueue(matchId, () => this.startUnlocked(matchId));
  }

  async restart(matchId: string): Promise<MatchDetailDto> {
    return this.enqueue(matchId, async () => {
      const match = await this.state.loadMatch(matchId);
      match.status = MatchStatus.READY;
      match.gameState = null;
      match.startedAt = null;
      match.finishedAt = null;
      match.winnerIds = [];
      match.currentPlayerId = null;
      await this.state.persistMatch(match);
      return this.startUnlocked(matchId);
    });
  }

  private async startUnlocked(matchId: string): Promise<MatchDetailDto> {
      const match = await this.state.loadMatch(matchId);
      if (match.players.length < 2) {
        throw new BadRequestException('Assign players before starting');
      }
      if (match.status === MatchStatus.LIVE) {
        throw new BadRequestException('Match is already live');
      }
      const tournament = await this.requireTournament(toObjectIdString(match.tournamentId));
      const gameState = createMatchState({
        matchId,
        initialConnected: false,
        rules: tournament.rules,
        players: match.players.map((player) => ({
          id: toObjectIdString(player.userId),
          userId: toObjectIdString(player.userId),
          name: player.name,
          color: player.color,
        })),
      });
      const saved = await this.state.updateMatchState(matchId, gameState, {
        status: MatchStatus.LIVE,
        startedAt: new Date(),
        finishedAt: null,
        winnerIds: [],
      });
      await this.recordEvent(saved, GameEventType.MATCH_STARTED, gameState.currentPlayerId);
      logEvent('Match started', { matchId, matchNumber: match.matchNumber });
      this.emitLive(matchId, 'match-started', {
        matchId,
        status: MatchStatus.LIVE,
      });
      this.emitLive(matchId, 'match-state', { matchId, state: gameState });
      await this.publishAdmin();
      return this.toDetailDto(saved, gameState);
  }

  async pause(matchId: string): Promise<MatchDetailDto> {
    return this.enqueue(matchId, async () => {
      const match = await this.state.loadMatch(matchId);
      if (match.status !== MatchStatus.LIVE || !match.gameState) {
        throw new BadRequestException('Only live matches can be paused');
      }
      const gameState = { ...match.gameState, status: MatchStatus.PAUSED, version: match.gameState.version + 1 };
      const saved = await this.state.updateMatchState(matchId, gameState, { status: MatchStatus.PAUSED });
      await this.recordEvent(saved, GameEventType.MATCH_PAUSED, gameState.currentPlayerId);
      logEvent('Match paused', { matchId });
      this.emitLive(matchId, 'match-paused', { matchId, status: MatchStatus.PAUSED });
      this.emitLive(matchId, 'match-state-updated', { matchId, state: gameState });
      await this.publishAdmin();
      return this.toDetailDto(saved, gameState);
    });
  }

  async resume(matchId: string): Promise<MatchDetailDto> {
    return this.enqueue(matchId, async () => {
      const match = await this.state.loadMatch(matchId);
      if (match.status !== MatchStatus.PAUSED || !match.gameState) {
        throw new BadRequestException('Only paused matches can be resumed');
      }
      const gameState = { ...match.gameState, status: MatchStatus.LIVE, version: match.gameState.version + 1 };
      const saved = await this.state.updateMatchState(matchId, gameState, { status: MatchStatus.LIVE });
      await this.recordEvent(saved, GameEventType.MATCH_RESUMED, gameState.currentPlayerId);
      logEvent('Match resumed', { matchId });
      this.emitLive(matchId, 'match-resumed', { matchId, status: MatchStatus.LIVE });
      this.emitLive(matchId, 'match-state-updated', { matchId, state: gameState });
      await this.publishAdmin();
      return this.toDetailDto(saved, gameState);
    });
  }

  async cancel(matchId: string): Promise<MatchDetailDto> {
    return this.enqueue(matchId, async () => {
      const match = await this.state.loadMatch(matchId);
      match.status = MatchStatus.CANCELLED;
      if (match.gameState) {
        match.gameState = { ...match.gameState, status: MatchStatus.CANCELLED };
      }
      match.finishedAt = new Date();
      const saved = await this.state.persistMatch(match);
      logEvent('Match cancelled', { matchId });
      this.emitLive(matchId, 'match-paused', {
        matchId,
        status: MatchStatus.CANCELLED,
      });
      await this.publishAdmin();
      return this.toDetailDto(saved);
    });
  }

  async remove(matchId: string): Promise<{ ok: true }> {
    return this.enqueue(matchId, async () => {
      const match = await this.state.loadMatch(matchId);
      if (this.broadcast.currentMatchId() === matchId) {
        await this.broadcast.setMatch(null);
      }
      this.emitLive(matchId, 'match-paused', {
        matchId,
        status: MatchStatus.CANCELLED,
      });
      await this.results.deleteMany({ matchId: match._id }).exec();
      await this.events.deleteMany({ matchId: match._id }).exec();
      await this.state.deletePersisted(matchId);
      logEvent('Match deleted', { matchId, matchNumber: match.matchNumber });
      await this.publishAdmin();
      return { ok: true as const };
    });
  }

  async rollDice(matchId: string, userId: string) {
    return this.enqueue(matchId, async () => {
      const match = await this.state.loadMatch(matchId);
      this.assertPlayer(match, userId);
      if (!match.gameState || match.status !== MatchStatus.LIVE) {
        throw new BadRequestException('Match is not live');
      }
      const result = applyDiceRoll(match.gameState, userId);
      const saved = await this.state.updateMatchState(matchId, result.state);
      await this.recordEngineEvents(saved, result.events, userId);
      logEvent('Dice rolled', { matchId, userId, value: result.state.dice.value ?? 0 });
      this.emitLive(matchId, 'dice-rolled', {
        matchId,
        playerId: userId,
        value: result.state.dice.value ?? 0,
        validPieceIds: result.validPieceIds,
        state: result.state,
      });
      this.emitLive(matchId, 'match-state-updated', { matchId, state: result.state });
      await this.publishAdmin();
      return result;
    });
  }

  async movePiece(matchId: string, userId: string, pieceId: string) {
    return this.enqueue(matchId, async () => {
      const match = await this.state.loadMatch(matchId);
      this.assertPlayer(match, userId);
      if (!match.gameState || match.status !== MatchStatus.LIVE) {
        throw new BadRequestException('Match is not live');
      }
      const result = applyMove(match.gameState, { playerId: userId, pieceId });
      const extra: Partial<Match> = {};
      if (result.state.status === MatchStatus.COMPLETED) {
        extra.finishedAt = new Date();
        extra.winnerIds = result.state.rankings.map((id) => new Types.ObjectId(id));
      }
      const saved = await this.state.updateMatchState(matchId, result.state, extra);
      await this.recordEngineEvents(saved, result.events, userId);
      if (result.state.status === MatchStatus.COMPLETED) {
        await this.completeMatch(saved, result.state);
      }
      logEvent('Piece moved', { matchId, userId, pieceId });
      this.emitLive(matchId, 'piece-moved', {
        matchId,
        playerId: userId,
        pieceId,
        state: result.state,
        events: result.events,
        animation: result.animation,
      });
      this.emitLive(matchId, 'match-state-updated', { matchId, state: result.state });
      if (result.state.status === MatchStatus.COMPLETED) {
        this.emitLive(matchId, 'match-finished', {
          matchId,
          rankings: result.state.rankings,
          state: result.state,
        });
        logEvent('Match completed', { matchId, winnerId: result.state.rankings[0] ?? '' });
      }
      await this.publishAdmin();
      return result;
    });
  }

  async setConnected(matchId: string, userId: string, connected: boolean): Promise<void> {
    await this.enqueue(matchId, async () => {
      const match = await this.state.loadMatch(matchId);
      if (!match.gameState) {
        return;
      }
      if (!match.players.some((player) => toObjectIdString(player.userId) === userId)) {
        return;
      }
      const gameState = {
        ...match.gameState,
        players: match.gameState.players.map((player) =>
          player.id === userId ? { ...player, connected } : player
        ),
        version: match.gameState.version + 1,
      };
      await this.state.updateMatchState(matchId, gameState);
      this.emitLive(matchId, connected ? 'player-connected' : 'player-disconnected', {
        matchId,
        playerId: userId,
      });
      this.emitLive(matchId, 'match-state-updated', { matchId, state: gameState });
      logEvent(connected ? 'Player connected' : 'Player disconnected', { matchId, userId });
    });
  }

  async list(filters: { tournamentId?: string; status?: MatchStatus }): Promise<MatchSummaryDto[]> {
    const query: Record<string, unknown> = {};
    if (filters.tournamentId) {
      query.tournamentId = new Types.ObjectId(filters.tournamentId);
    }
    if (filters.status) {
      query.status = filters.status;
    }
    const matches = await this.matches.find(query).sort({ matchNumber: 1 }).exec();
    const tournamentNames = await this.tournamentNames(matches.map((match) => match.tournamentId));
    return matches.map((match) =>
      toSummary(match, tournamentNames.get(toObjectIdString(match.tournamentId)) ?? 'Tournament')
    );
  }

  async getDetail(matchId: string): Promise<MatchDetailDto> {
    const match = await this.state.loadMatch(matchId);
    return this.toDetailDto(match);
  }

  async listForPlayer(userId: string): Promise<MatchSummaryDto[]> {
    const matches = await this.matches
      .find({ 'players.userId': new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .exec();
    const tournamentNames = await this.tournamentNames(matches.map((match) => match.tournamentId));
    return matches.map((match) =>
      toSummary(match, tournamentNames.get(toObjectIdString(match.tournamentId)) ?? 'Tournament')
    );
  }

  async getResult(matchId: string): Promise<MatchResultDto> {
    const result = await this.results.findOne({ matchId: new Types.ObjectId(matchId) }).exec();
    if (!result) {
      throw new NotFoundException('Match result not found');
    }
    return {
      id: toObjectIdString(result._id),
      matchId: toObjectIdString(result.matchId),
      tournamentId: toObjectIdString(result.tournamentId),
      rankings: result.rankings.map((entry) => ({
        userId: toObjectIdString(entry.userId),
        name: entry.name,
        place: entry.place,
      })),
      finishedAt: result.finishedAt.toISOString(),
    };
  }

  async neighbors(matchId: string): Promise<{ previousId: string | null; nextId: string | null; index: number; total: number }> {
    const match = await this.state.loadMatch(matchId);
    const siblings = await this.matches
      .find({ tournamentId: match.tournamentId })
      .sort({ matchNumber: 1 })
      .exec();
    const index = siblings.findIndex((item) => toObjectIdString(item._id) === matchId);
    const previous = index > 0 ? siblings[index - 1] : undefined;
    const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined;
    return {
      previousId: previous ? toObjectIdString(previous._id) : null,
      nextId: next ? toObjectIdString(next._id) : null,
      index: index + 1,
      total: siblings.length,
    };
  }

  async publishAdmin(): Promise<void> {
    const matches = await this.list({});
    const broadcastMatchId = this.broadcast.currentMatchId();
    this.realtime.emitToAdmin('matches-updated', { matches, broadcastMatchId });
  }

  async setBroadcastMatch(matchId: string): Promise<{ matchId: string | null }> {
    await this.broadcast.setMatch(matchId);
    const detail = await this.getDetail(matchId);
    if (detail.gameState) {
      this.realtime.emitToBroadcast('match-state', {
        matchId,
        state: detail.gameState,
      });
    }
    await this.publishAdmin();
    return { matchId };
  }

  private emitLive(
    matchId: string,
    event: keyof ServerToClientEvents,
    payload: unknown
  ): void {
    this.realtime.emitToMatch(matchId, event, payload);
    if (this.broadcast.currentMatchId() === matchId) {
      this.realtime.emitToBroadcast(event, payload);
    }
  }

  private async completeMatch(match: MatchDocument, gameState: GameState): Promise<void> {
    const rankings = gameState.rankings.map((userId, index) => {
      const player = match.players.find((entry) => toObjectIdString(entry.userId) === userId);
      return {
        userId: new Types.ObjectId(userId),
        name: player?.name ?? 'Player',
        place: index + 1,
      };
    });
    const write = async (): Promise<void> => {
      await this.results.findOneAndUpdate(
        { matchId: match._id },
        {
          matchId: match._id,
          tournamentId: match.tournamentId,
          rankings,
          finishedAt: match.finishedAt ?? new Date(),
        },
        { upsert: true }
      );
    };
    try {
      const session = await this.connection.startSession();
      await session.withTransaction(async () => {
        await this.results.findOneAndUpdate(
          { matchId: match._id },
          {
            matchId: match._id,
            tournamentId: match.tournamentId,
            rankings,
            finishedAt: match.finishedAt ?? new Date(),
          },
          { upsert: true, session }
        );
      });
      await session.endSession();
    } catch {
      await write();
    }
  }

  private assertPlayer(match: MatchDocument, userId: string): void {
    if (!match.players.some((player) => toObjectIdString(player.userId) === userId)) {
      throw new BadRequestException('You are not in this match');
    }
  }

  private async recordEngineEvents(
    match: MatchDocument,
    events: Array<{ type: string; playerId?: string; payload?: Record<string, string | number | boolean | null> }>,
    fallbackPlayerId: string
  ): Promise<void> {
    const persistable = new Set<string>([
      GameEventType.DICE_ROLLED,
      GameEventType.PIECE_MOVED,
      GameEventType.PIECE_CAPTURED,
      GameEventType.PIECE_REACHED_HOME,
      GameEventType.PLAYER_FINISHED,
      GameEventType.TURN_CHANGED,
      GameEventType.MATCH_FINISHED,
    ]);
    for (const event of events) {
      if (persistable.has(event.type)) {
        await this.recordEvent(match, event.type as GameEventType, event.playerId ?? fallbackPlayerId, event.payload);
      }
    }
  }

  private async recordEvent(
    match: MatchDocument,
    type: GameEventType,
    playerId?: string,
    payload: Record<string, string | number | boolean | null> = {}
  ): Promise<void> {
    const last = await this.events.findOne({ matchId: match._id }).sort({ sequence: -1 }).exec();
    await this.events.create({
      matchId: match._id,
      sequence: (last?.sequence ?? 0) + 1,
      type,
      playerId: playerId ? new Types.ObjectId(playerId) : undefined,
      payload,
    });
  }

  private async ensureParticipants(tournamentId: Types.ObjectId, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      const user = await this.users.findById(userId);
      const existing = await this.participants
        .findOne({ tournamentId, userId: user._id })
        .exec();
      if (existing) {
        continue;
      }
      const seed = (await this.participants.countDocuments({ tournamentId })) + 1;
      await this.participants.create({
        tournamentId,
        userId: user._id,
        seed,
        status: ParticipantStatus.REGISTERED,
      });
    }
  }

  private async requireTournament(id: string): Promise<TournamentDocument> {
    const tournament = await this.tournaments.findById(id).exec();
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    return tournament;
  }

  private async tournamentNames(ids: Types.ObjectId[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.map((id) => toObjectIdString(id)))];
    const tournaments = await this.tournaments.find({ _id: { $in: unique } }).exec();
    return new Map(tournaments.map((item) => [toObjectIdString(item._id), item.name]));
  }

  private async toDetailDto(match: MatchDocument, gameState?: MatchDocument['gameState']): Promise<MatchDetailDto> {
    const tournament = await this.requireTournament(toObjectIdString(match.tournamentId));
    return toDetail(match, tournament.name, gameState ?? match.gameState);
  }
}

function shuffle<T>(items: T[]): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = items[index];
    const other = items[swap];
    if (current !== undefined && other !== undefined) {
      items[index] = other;
      items[swap] = current;
    }
  }
}
