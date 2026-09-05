import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BulkUserCreateResultDto, UserDto, UserRole } from '@ludo-game/shared-types';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { BulkCreateUsersDto } from './dto/bulk-create-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user';
import { SessionUser } from '../common/types';
import { PresenceService } from './presence.service';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly presence: PresenceService
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async list(): Promise<UserDto[]> {
    const online = new Set(this.presence.ids());
    const users = await this.users.listAll();
    return users.map((user) => ({ ...user, online: online.has(user.id) }));
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateUserDto): Promise<UserDto> {
    return this.users.create(dto);
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN)
  createMany(@Body() dto: BulkCreateUsersDto): Promise<BulkUserCreateResultDto> {
    return this.users.createMany(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserDto> {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() actor: SessionUser): Promise<{ ok: true }> {
    if (actor.id === id) {
      throw new BadRequestException('You cannot delete your own account');
    }
    await this.users.remove(id);
    return { ok: true };
  }
}
