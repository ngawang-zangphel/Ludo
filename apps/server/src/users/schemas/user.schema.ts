import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '@ludo-game/shared-types';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ type: String, required: true, enum: UserRole, default: UserRole.PLAYER })
  role!: UserRole;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

// Unique login lookup.
UserSchema.index({ email: 1 }, { unique: true });
