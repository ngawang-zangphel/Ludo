import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { GameState, MatchStatus, PlayerColor } from '@ludo-game/shared-types';

@Schema({ _id: false })
export class MatchPlayer {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: String, required: true, enum: PlayerColor })
  color!: PlayerColor;
}

@Schema({ timestamps: true })
export class Match {
  @Prop({ type: Types.ObjectId, ref: 'Tournament', required: true })
  tournamentId!: Types.ObjectId;

  @Prop({ required: true })
  round!: string;

  @Prop({ required: true })
  roundNumber!: number;

  @Prop({ required: true })
  matchNumber!: number;

  @Prop({ type: String, required: true, enum: MatchStatus, default: MatchStatus.WAITING })
  status!: MatchStatus;

  @Prop({ type: [MatchPlayer], default: [] })
  players!: MatchPlayer[];

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  currentPlayerId!: Types.ObjectId | null;

  @Prop({ type: [Types.ObjectId], default: [] })
  winnerIds!: Types.ObjectId[];

  @Prop({ type: SchemaTypes.Mixed, default: null })
  gameState!: GameState | null;

  @Prop({ type: Date, default: null })
  startedAt!: Date | null;

  @Prop({ type: Date, default: null })
  finishedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type MatchDocument = HydratedDocument<Match>;
export const MatchSchema = SchemaFactory.createForClass(Match);

MatchSchema.set('optimisticConcurrency', true);

// Admin dashboard: filter matches in a tournament by status.
MatchSchema.index({ tournamentId: 1, status: 1 });
// Round bracket views.
MatchSchema.index({ tournamentId: 1, round: 1 });
// Unique match number within a tournament.
MatchSchema.index({ tournamentId: 1, matchNumber: 1 }, { unique: true });
// Reconnect: find a player's current matches.
MatchSchema.index({ 'players.userId': 1, status: 1 });
// Duration / recency sorting.
MatchSchema.index({ updatedAt: -1 });
