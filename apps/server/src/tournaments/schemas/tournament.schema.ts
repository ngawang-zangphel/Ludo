import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  DEFAULT_DISCONNECT_RULES,
  DEFAULT_LUDO_RULES,
  DisconnectRules,
  GameType,
  LudoRules,
  SnakesRules,
  TournamentStatus,
} from '@ludo-game/shared-types';

@Schema({ _id: false })
export class TournamentRound {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  number!: number;
}

@Schema({ timestamps: true })
export class Tournament {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, enum: TournamentStatus, default: TournamentStatus.DRAFT })
  status!: TournamentStatus;

  @Prop({ type: String, enum: GameType, default: GameType.LUDO })
  gameType!: GameType;

  @Prop({ type: Object, default: DEFAULT_LUDO_RULES })
  rules!: LudoRules | SnakesRules;

  @Prop({ type: Object, default: DEFAULT_DISCONNECT_RULES })
  disconnectRules!: DisconnectRules;

  @Prop({ type: [TournamentRound], default: [] })
  rounds!: TournamentRound[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type TournamentDocument = HydratedDocument<Tournament>;
export const TournamentSchema = SchemaFactory.createForClass(Tournament);

// Admin dashboard filters by live/draft/completed tournaments.
TournamentSchema.index({ status: 1 });
TournamentSchema.index({ createdAt: -1 });
