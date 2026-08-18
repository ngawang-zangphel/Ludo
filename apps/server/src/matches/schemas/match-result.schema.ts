import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class RankingEntry {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  place!: number;
}

@Schema({ timestamps: true })
export class MatchResult {
  @Prop({ type: Types.ObjectId, ref: 'Match', required: true, unique: true })
  matchId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tournament', required: true })
  tournamentId!: Types.ObjectId;

  @Prop({ type: [RankingEntry], default: [] })
  rankings!: RankingEntry[];

  @Prop({ type: Date, required: true })
  finishedAt!: Date;
}

export type MatchResultDocument = HydratedDocument<MatchResult>;
export const MatchResultSchema = SchemaFactory.createForClass(MatchResult);

MatchResultSchema.index({ tournamentId: 1, finishedAt: -1 });
