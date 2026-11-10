import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { config } from '../config.js';
import { AuthGuard } from './auth.guard.js';
import { SessionService } from './session.service.js';

@Module({
  imports: [
    JwtModule.register({
      secret: config.jwtSecret,
      signOptions: { expiresIn: config.sessionTtlSeconds },
    }),
  ],
  providers: [SessionService, AuthGuard],
  exports: [SessionService, AuthGuard],
})
export class SessionModule {}
