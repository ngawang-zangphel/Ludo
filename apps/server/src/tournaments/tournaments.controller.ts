import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ParticipantDto, TournamentDto, UserRole } from '@ludo-game/shared-types';
import { TournamentsService } from './tournaments.service';
import {
  CreateTournamentDto,
  RegisterParticipantDto,
  UpdateTournamentStatusDto,
} from './dto/tournament.dto';
import { AuthGuard } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('tournaments')
@UseGuards(AuthGuard, RolesGuard)
export class TournamentsController {
  constructor(private readonly tournaments: TournamentsService) {}

  @Get()
  list(): Promise<TournamentDto[]> {
    return this.tournaments.list();
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<TournamentDto> {
    return this.tournaments.get(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateTournamentDto): Promise<TournamentDto> {
    return this.tournaments.create(dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  setStatus(@Param('id') id: string, @Body() dto: UpdateTournamentStatusDto): Promise<TournamentDto> {
    return this.tournaments.setStatus(id, dto.status);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string): Promise<{ ok: true }> {
    return this.tournaments.remove(id);
  }

  @Get(':id/participants')
  participants(@Param('id') id: string): Promise<ParticipantDto[]> {
    return this.tournaments.listParticipants(id);
  }

  @Post(':id/participants')
  @Roles(UserRole.ADMIN)
  register(@Param('id') id: string, @Body() dto: RegisterParticipantDto): Promise<ParticipantDto> {
    return this.tournaments.register(id, dto);
  }

  @Post(':id/rounds/:roundNumber/advance')
  @Roles(UserRole.ADMIN)
  advance(@Param('id') id: string, @Param('roundNumber') roundNumber: string): Promise<{ ok: true }> {
    return this.tournaments.advance(id, Number(roundNumber)).then(() => ({ ok: true }));
  }
}
