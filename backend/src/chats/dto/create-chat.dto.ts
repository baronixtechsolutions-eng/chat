import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class CreateChatDto {
  @IsArray({ message: 'Selecciona al menos un usuario' })
  @ArrayMinSize(1, { message: 'Selecciona al menos un usuario' })
  @ArrayMaxSize(20, { message: 'Un chat admite como máximo 20 usuarios' })
  @IsUUID('all', { each: true, message: 'Usuario no válido' })
  participantIds: string[];
}
