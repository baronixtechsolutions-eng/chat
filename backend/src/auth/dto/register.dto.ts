import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeEmail, trim } from './transforms.js';

export class RegisterDto {
  @Transform(trim)
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(2, 50, { message: 'El nombre debe tener entre 2 y 50 caracteres' })
  name: string;

  @Transform(normalizeEmail)
  @IsString({ message: 'El correo es obligatorio' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @MaxLength(254, { message: 'El correo es demasiado largo' })
  email: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  // bcrypt ignores everything after 72 bytes
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' })
  password: string;
}
