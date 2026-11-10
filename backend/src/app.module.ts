import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { Chat } from './chats/chat.entity.js';
import { ChatsModule } from './chats/chats.module.js';
import { Message } from './chats/message.entity.js';
import { config } from './config.js';
import { InitialSchema1762780000000 } from './database/migrations/1762780000000-initial-schema.js';
import { User } from './users/user.entity.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: config.databaseUrl,
      entities: [User, Chat, Message],
      migrations: [InitialSchema1762780000000],
      migrationsRun: true,
      synchronize: false,
    }),
    AuthModule,
    UsersModule,
    ChatsModule,
  ],
})
export class AppModule {}
