import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserDto, UserRole } from '@ludo-game/shared-types';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  list(): Promise<UserDto[]> {
    return this.users.listPlayers();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateUserDto): Promise<UserDto> {
    return this.users.create(dto);
  }
}
