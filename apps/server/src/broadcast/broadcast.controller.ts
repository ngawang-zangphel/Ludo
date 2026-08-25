import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { BroadcastStateDto, UserRole } from '@ludo-game/shared-types';
import { BroadcastService } from './broadcast.service';
import { MatchesService } from '../matches/matches.service';
import { AuthGuard } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('broadcast')
export class BroadcastController {
  constructor(
    private readonly broadcast: BroadcastService,
    private readonly matches: MatchesService
  ) {}

  @Get()
  async current(): Promise<BroadcastStateDto> {
    const matchId = this.broadcast.currentMatchId();
    if (!matchId) {
      return { matchId: null, match: null };
    }
    const match = await this.matches.getDetail(matchId);
    return { matchId, match };
  }

  @Delete()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  stop(): Promise<{ matchId: null }> {
    return this.matches.clearBroadcast();
  }
}
