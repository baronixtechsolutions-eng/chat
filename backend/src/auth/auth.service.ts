import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { QueryFailedError } from 'typeorm';
import { toPublicUser, UsersService } from '../users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

const BCRYPT_ROUNDS = 12;
const UNIQUE_VIOLATION = '23505';

// Compared against when the email does not exist, so a failed login takes the
// same time whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService) {}

  async register({ name, email, password }: RegisterDto) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    try {
      const user = await this.users.create({ name, email, passwordHash });
      return toPublicUser(user);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException('Ya existe una cuenta con este correo');
      }
      throw error;
    }
  }

  async login({ email, password }: LoginDto) {
    const user = await this.users.findByEmailWithPassword(email);
    const valid = await bcrypt.compare(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !valid) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    return toPublicUser(user);
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Tu sesión no es válida o ha expirado');
    }
    return toPublicUser(user);
  }
}
