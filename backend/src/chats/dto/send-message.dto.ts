import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { trim } from '../../auth/dto/transforms.js';

export const MAX_MESSAGE_LENGTH = 2000;

export class SendMessageDto {
  @IsUUID('all', { message: 'Chat no válido' })
  chatId: string;

  @Transform(trim)
  @IsString({ message: 'El mensaje no puede estar vacío' })
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  @MaxLength(MAX_MESSAGE_LENGTH, {
    message: `El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres`,
  })
  content: string;
}
