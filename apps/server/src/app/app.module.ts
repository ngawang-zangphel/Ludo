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
import { SnakesBoardsModule } from '../snakes-boards/snakes-boards.module';
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
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI', '');
        if (
          !uri ||
          uri.includes('<db_username>') ||
          uri.includes('<password>') ||
          uri.includes('USER:PASSWORD')
        ) {
          throw new Error(
            'MONGODB_URI is missing a real Atlas username. In apps/server/.env replace <db_username> with the Database User from Atlas → Security → Database Access (no angle brackets). Then restart npm start.'
          );
        }
        return {
          uri,
          serverSelectionTimeoutMS: 10000,
        };
      },
    }),
    RealtimeModule,
    UsersModule,
    AuthModule,
    TournamentsModule,
    SnakesBoardsModule,
    MatchesModule,
    BroadcastModule,
    GameModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
