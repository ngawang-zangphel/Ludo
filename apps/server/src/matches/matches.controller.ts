import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  MatchDetailDto,
  MatchResultDto,
  MatchStatus,
  MatchSummaryDto,
  UserRole,
} from '@ludo-game/shared-types';
import { MatchesService } from './matches.service';
import { AssignPlayersDto, CreateMatchDto } from './dto/match.dto';
import { AuthGuard } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user';
import { SessionUser } from '../common/types';

@Controller('matches')
@UseGuards(AuthGuard, RolesGuard)
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get()
  list(
    @Query('tournamentId') tournamentId?: string,
    @Query('status') status?: MatchStatus
  ): Promise<MatchSummaryDto[]> {
    return this.matches.list({ tournamentId, status });
  }

  @Get('mine')
  mine(@CurrentUser() user: SessionUser): Promise<MatchSummaryDto[]> {
    return this.matches.listForPlayer(user.id);
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<MatchDetailDto> {
    return this.matches.getDetail(id);
  }

  @Get(':id/result')
  result(@Param('id') id: string): Promise<MatchResultDto> {
    return this.matches.getResult(id);
  }

  @Get(':id/neighbors')
  neighbors(@Param('id') id: string) {
    return this.matches.neighbors(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateMatchDto): Promise<MatchDetailDto> {
    return this.matches.create(dto);
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN)
  assign(@Param('id') id: string, @Body() dto: AssignPlayersDto): Promise<MatchDetailDto> {
    return this.matches.assignPlayers(id, dto);
  }

  @Post(':id/assign-random')
  @Roles(UserRole.ADMIN)
  assignRandom(@Param('id') id: string): Promise<MatchDetailDto> {
    return this.matches.assignRandom(id);
  }

  @Post(':id/start')
  @Roles(UserRole.ADMIN)
  start(@Param('id') id: string): Promise<MatchDetailDto> {
    return this.matches.start(id);
  }

  @Post(':id/pause')
  @Roles(UserRole.ADMIN)
  pause(@Param('id') id: string): Promise<MatchDetailDto> {
    return this.matches.pause(id);
  }

  @Post(':id/resume')
  @Roles(UserRole.ADMIN)
  resume(@Param('id') id: string): Promise<MatchDetailDto> {
    return this.matches.resume(id);
  }

  @Post(':id/restart')
  @Roles(UserRole.ADMIN)
  restart(@Param('id') id: string): Promise<MatchDetailDto> {
    return this.matches.restart(id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN)
  cancel(@Param('id') id: string): Promise<MatchDetailDto> {
    return this.matches.cancel(id);
  }

  @Post(':id/broadcast')
  @Roles(UserRole.ADMIN)
  broadcastMatch(@Param('id') id: string): Promise<{ matchId: string | null }> {
    return this.matches.setBroadcastMatch(id);
  }
}
