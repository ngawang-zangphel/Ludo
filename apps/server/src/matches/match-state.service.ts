import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GameState, MatchStatus } from '@ludo-game/shared-types';
import { Match, MatchDocument } from './schemas/match.schema';
import { GameSnapshot, GameSnapshotDocument } from './schemas/game-snapshot.schema';
import { logEvent } from '../common/logger';

@Injectable()
export class MatchStateService {
  private readonly cache = new Map<string, MatchDocument>();

  constructor(
    @InjectModel(Match.name) private readonly matches: Model<MatchDocument>,
    @InjectModel(GameSnapshot.name) private readonly snapshots: Model<GameSnapshotDocument>
  ) {}

  async getMatch(matchId: string): Promise<MatchDocument> {
    const cached = this.cache.get(matchId);
    if (cached) {
      return cached;
    }
    return this.loadMatch(matchId);
  }

  async loadMatch(matchId: string): Promise<MatchDocument> {
    const match = await this.matches.findById(matchId).exec();
    if (!match) {
      throw new NotFoundException(`Match ${matchId} not found`);
    }
    this.cache.set(matchId, match);
    return match;
  }

  async updateMatchState(matchId: string, gameState: GameState, extra: Partial<Match> = {}): Promise<MatchDocument> {
    const current = await this.getMatch(matchId);
    const expectedVersion = current.gameState?.version ?? -1;
    const updated = await this.matches
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(matchId),
          $or: [{ 'gameState.version': expectedVersion }, { gameState: null }],
        },
        {
          $set: {
            gameState,
            currentPlayerId: gameState.currentPlayerId
              ? new Types.ObjectId(gameState.currentPlayerId)
              : null,
            status: gameState.status,
            winnerIds: gameState.rankings.map((id) => new Types.ObjectId(id)),
            ...extra,
          },
        },
        { new: true }
      )
      .exec();

    if (!updated) {
      this.cache.delete(matchId);
      throw new ConflictException('Stale match state; retry the action');
    }

    this.cache.set(matchId, updated);
    if (gameState.version === 1 || gameState.version % 10 === 0 || gameState.status === MatchStatus.COMPLETED) {
      await this.snapshots.create({
        matchId: updated._id,
        version: gameState.version,
        gameState,
      });
    }
    return updated;
  }

  async persistMatch(match: MatchDocument): Promise<MatchDocument> {
    try {
      const saved = await match.save();
      this.cache.set(String(saved._id), saved);
      return saved;
    } catch (error) {
      this.cache.delete(String(match._id));
      throw error;
    }
  }

  removeMatchState(matchId: string): void {
    this.cache.delete(matchId);
  }

  async listCached(): Promise<MatchDocument[]> {
    return [...this.cache.values()];
  }
}
