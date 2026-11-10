import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUserId } from './current-user.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { SESSION_COOKIE, SessionService } from './session.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.register(dto);
    this.startSession(res, user.id);
    return user;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.login(dto);
    this.startSession(res, user.id);
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    const { maxAge: _, ...options } = this.sessions.cookieOptions();
    res.clearCookie(SESSION_COOKIE, options);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUserId() userId: string) {
    return this.auth.me(userId);
  }

  private startSession(res: Response, userId: string) {
    res.cookie(
      SESSION_COOKIE,
      this.sessions.issue(userId),
      this.sessions.cookieOptions(),
    );
  }
}
