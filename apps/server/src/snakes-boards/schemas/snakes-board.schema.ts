import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SnakesBoardLayout } from '@ludo-game/shared-types';

@Schema({ timestamps: true })
export class SnakesCustomBoard {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Object, required: true })
  layout!: SnakesBoardLayout;

  createdAt?: Date;
  updatedAt?: Date;
}

export type SnakesCustomBoardDocument = HydratedDocument<SnakesCustomBoard>;
export const SnakesCustomBoardSchema = SchemaFactory.createForClass(SnakesCustomBoard);

SnakesCustomBoardSchema.index({ name: 1 });
