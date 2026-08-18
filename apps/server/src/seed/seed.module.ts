import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { UsersModule } from '../users/users.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [UsersModule, TournamentsModule, MatchesModule],
  providers: [SeedService],
})
export class SeedModule {}
