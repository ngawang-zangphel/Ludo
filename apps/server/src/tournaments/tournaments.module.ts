import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tournament, TournamentSchema } from './schemas/tournament.schema';
import {
  TournamentParticipant,
  TournamentParticipantSchema,
} from './schemas/participant.schema';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { UsersModule } from '../users/users.module';
import { MatchesModule } from '../matches/matches.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
      { name: TournamentParticipant.name, schema: TournamentParticipantSchema },
    ]),
    UsersModule,
    MatchesModule,
    AuthModule,
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TournamentsService, MongooseModule],
})
export class TournamentsModule {}
