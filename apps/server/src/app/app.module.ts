import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { MatchesModule } from '../matches/matches.module';
import { GameModule } from '../game/game.module';
import { BroadcastModule } from '../broadcast/broadcast.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SeedModule } from '../seed/seed.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/server/.env', '.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://127.0.0.1:27017/ludo-arena'),
      }),
    }),
    RealtimeModule,
    UsersModule,
    AuthModule,
    TournamentsModule,
    MatchesModule,
    BroadcastModule,
    GameModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
