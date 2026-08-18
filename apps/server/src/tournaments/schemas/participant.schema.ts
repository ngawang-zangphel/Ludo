import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ParticipantStatus } from '@ludo-game/shared-types';

@Schema({ timestamps: true })
export class TournamentParticipant {
  @Prop({ type: Types.ObjectId, ref: 'Tournament', required: true })
  tournamentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  seed!: number;

  @Prop({ type: String, required: true, enum: ParticipantStatus, default: ParticipantStatus.REGISTERED })
  status!: ParticipantStatus;

  @Prop({ type: Number })
  finalRank?: number;
}

export type TournamentParticipantDocument = HydratedDocument<TournamentParticipant>;
export const TournamentParticipantSchema = SchemaFactory.createForClass(TournamentParticipant);

// One registration per user per tournament.
TournamentParticipantSchema.index({ tournamentId: 1, userId: 1 }, { unique: true });
// Bracket assignment and status filters.
TournamentParticipantSchema.index({ tournamentId: 1, status: 1 });
TournamentParticipantSchema.index({ userId: 1 });
