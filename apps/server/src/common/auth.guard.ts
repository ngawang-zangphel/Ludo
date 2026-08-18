import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { SessionUser } from './types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      cookies?: Record<string, string>;
      user?: SessionUser;
    }>();
    const token = request.cookies?.[this.auth.cookieName];
    const user = this.auth.verifyToken(token);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    request.user = user;
    return true;
  }
}
