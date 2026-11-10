import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions } from 'express';
import { config } from '../config.js';

export const SESSION_COOKIE = 'session';

export interface Session {
  userId: string;
  expiresAt: number; // epoch seconds
}

@Injectable()
export class SessionService {
  constructor(private readonly jwt: JwtService) {}

  issue(userId: string): string {
    return this.jwt.sign({ sub: userId });
  }

  verify(token: string | undefined): Session | null {
    if (!token) return null;
    try {
      const { sub, exp } = this.jwt.verify<{ sub: string; exp: number }>(token);
      return { userId: sub, expiresAt: exp };
    } catch {
      return null;
    }
  }

  cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.cookieSecure,
      path: '/',
      maxAge: config.sessionTtlSeconds * 1000,
    };
  }
}
