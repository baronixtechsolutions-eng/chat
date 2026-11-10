import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SESSION_COOKIE, SessionService } from './session.service.js';

export type AuthenticatedRequest = Request & { userId: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = this.sessions.verify(request.cookies?.[SESSION_COOKIE]);
    if (!session) {
      throw new UnauthorizedException('Tu sesión no es válida o ha expirado');
    }
    request.userId = session.userId;
    return true;
  }
}
