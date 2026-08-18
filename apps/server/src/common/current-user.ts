import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionUser } from './types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const request = context.switchToHttp().getRequest<{ user: SessionUser }>();
    return request.user;
  }
);
