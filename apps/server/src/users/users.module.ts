import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PresenceService } from './presence.service';
import { AuthModule } from '../auth/auth.module';
import { Match, MatchSchema } from '../matches/schemas/match.schema';
import {
  TournamentParticipant,
  TournamentParticipantSchema,
} from '../tournaments/schemas/participant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Match.name, schema: MatchSchema },
      { name: TournamentParticipant.name, schema: TournamentParticipantSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, PresenceService],
  exports: [UsersService, PresenceService, MongooseModule],
})
export class UsersModule {}
