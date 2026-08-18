import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthResponseDto } from '@ludo-game/shared-types';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user';
import { SessionUser } from '../common/types';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService
  ) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<AuthResponseDto> {
    const user = await this.auth.login(dto, response);
    return { user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response): { ok: true } {
    this.auth.logout(response);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() session: SessionUser): Promise<AuthResponseDto> {
    const user = await this.users.findById(session.id);
    return { user: this.users.toDto(user) };
  }

  @Get('bootstrap-hint')
  hint(): { adminEmail: string; playerHint: string } {
    return {
      adminEmail: 'admin@ludo.arena',
      playerHint: 'Seeded players use password Player123!',
    };
  }
}
