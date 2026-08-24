import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { AuthModule } from '../auth/auth.module';
import { MatchesModule } from '../matches/matches.module';
import { BroadcastModule } from '../broadcast/broadcast.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, MatchesModule, BroadcastModule, RealtimeModule, UsersModule],
  providers: [GameGateway],
})
export class GameModule {}
