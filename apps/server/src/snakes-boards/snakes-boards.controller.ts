import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SnakesCustomBoardDto, UserRole } from '@ludo-game/shared-types';
import { AuthGuard } from '../common/auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateSnakesBoardDto, UpdateSnakesBoardDto } from './dto/snakes-board.dto';
import { SnakesBoardsService } from './snakes-boards.service';

@Controller('snakes-boards')
@UseGuards(AuthGuard, RolesGuard)
export class SnakesBoardsController {
  constructor(private readonly boards: SnakesBoardsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  list(): Promise<SnakesCustomBoardDto[]> {
    return this.boards.list();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateSnakesBoardDto): Promise<SnakesCustomBoardDto> {
    return this.boards.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSnakesBoardDto
  ): Promise<SnakesCustomBoardDto> {
    return this.boards.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    await this.boards.remove(id);
    return { ok: true };
  }
}
