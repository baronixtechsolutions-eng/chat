import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionModule } from '../auth/session.module.js';
import { UsersModule } from '../users/users.module.js';
import { Chat } from './chat.entity.js';
import { ChatsController } from './chats.controller.js';
import { ChatsGateway } from './chats.gateway.js';
import { ChatsService } from './chats.service.js';
import { Message } from './message.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Message]),
    SessionModule,
    UsersModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway],
})
export class ChatsModule {}
