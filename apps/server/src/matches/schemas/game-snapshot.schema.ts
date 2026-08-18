import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { GameState } from '@ludo-game/shared-types';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class GameSnapshot {
  @Prop({ type: Types.ObjectId, ref: 'Match', required: true })
  matchId!: Types.ObjectId;

  @Prop({ required: true })
  version!: number;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  gameState!: GameState;
}

export type GameSnapshotDocument = HydratedDocument<GameSnapshot>;
export const GameSnapshotSchema = SchemaFactory.createForClass(GameSnapshot);

GameSnapshotSchema.index({ matchId: 1, version: -1 });
