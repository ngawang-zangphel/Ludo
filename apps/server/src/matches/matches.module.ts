import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from './schemas/match.schema';
import { MatchResult, MatchResultSchema } from './schemas/match-result.schema';
import { MatchEvent, MatchEventSchema } from './schemas/match-event.schema';
import { GameSnapshot, GameSnapshotSchema } from './schemas/game-snapshot.schema';
import { Tournament, TournamentSchema } from '../tournaments/schemas/tournament.schema';
import {
  TournamentParticipant,
  TournamentParticipantSchema,
} from '../tournaments/schemas/participant.schema';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { MatchStateService } from './match-state.service';
import { MatchCommandQueue } from './match-command-queue.service';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { BroadcastModule } from '../broadcast/broadcast.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Match.name, schema: MatchSchema },
      { name: MatchResult.name, schema: MatchResultSchema },
      { name: MatchEvent.name, schema: MatchEventSchema },
      { name: GameSnapshot.name, schema: GameSnapshotSchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: TournamentParticipant.name, schema: TournamentParticipantSchema },
    ]),
    UsersModule,
    RealtimeModule,
    AuthModule,
    forwardRef(() => BroadcastModule),
  ],
  controllers: [MatchesController],
  providers: [MatchesService, MatchStateService, MatchCommandQueue],
  exports: [MatchesService, MatchStateService, MatchCommandQueue, MongooseModule],
})
export class MatchesModule {}
