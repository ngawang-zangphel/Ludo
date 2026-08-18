import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { GameEventType } from '@ludo-game/shared-types';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class MatchEvent {
  @Prop({ type: Types.ObjectId, ref: 'Match', required: true })
  matchId!: Types.ObjectId;

  @Prop({ required: true })
  sequence!: number;

  @Prop({ type: String, required: true, enum: GameEventType })
  type!: GameEventType;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  playerId?: Types.ObjectId;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  payload!: Record<string, string | number | boolean | null>;
}

export type MatchEventDocument = HydratedDocument<MatchEvent>;
export const MatchEventSchema = SchemaFactory.createForClass(MatchEvent);

MatchEventSchema.index({ matchId: 1, sequence: 1 }, { unique: true });
