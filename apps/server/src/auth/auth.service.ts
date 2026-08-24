import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { UserDto, UserRole } from '@ludo-game/shared-types';
import { UsersService } from '../users/users.service';
import { SessionUser } from '../common/types';
import { toObjectIdString } from '../common/types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { logEvent } from '../common/logger';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  get cookieName(): string {
    return this.config.get<string>('COOKIE_NAME', 'ludo_session');
  }

  async login(dto: LoginDto, response: Response): Promise<UserDto> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await this.users.verifyPassword(user, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const session: SessionUser = {
      id: toObjectIdString(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    };
    this.setSessionCookie(response, session);
    logEvent('User logged in', { userId: session.id, role: session.role });
    return this.users.toDto(user);
  }

  async register(dto: RegisterDto, response: Response): Promise<UserDto> {
    const created = await this.users.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: UserRole.PLAYER,
    });
    const session: SessionUser = {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
    };
    this.setSessionCookie(response, session);
    logEvent('User registered', { userId: session.id, role: session.role });
    return created;
  }

  logout(response: Response): void {
    response.clearCookie(this.cookieName, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  verifyToken(token: string | undefined): SessionUser | null {
    if (!token) {
      return null;
    }
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }

  setSessionCookie(response: Response, user: SessionUser): void {
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    } satisfies JwtPayload);
    const configured = this.config.get<string>('COOKIE_SECURE');
    const secure =
      configured !== undefined && configured !== ''
        ? configured === 'true'
        : process.env.NODE_ENV === 'production';
    response.cookie(this.cookieName, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
