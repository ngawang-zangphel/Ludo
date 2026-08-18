import { Controller, Get, UseGuards } from '@nestjs/common';
import { BroadcastStateDto } from '@ludo-game/shared-types';
import { BroadcastService } from './broadcast.service';
import { MatchesService } from '../matches/matches.service';
import { AuthGuard } from '../common/auth.guard';

@Controller('broadcast')
export class BroadcastController {
  constructor(
    private readonly broadcast: BroadcastService,
    private readonly matches: MatchesService
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async current(): Promise<BroadcastStateDto> {
    const matchId = this.broadcast.currentMatchId();
    if (!matchId) {
      return { matchId: null, match: null };
    }
    const match = await this.matches.getDetail(matchId);
    return { matchId, match };
  }
}
