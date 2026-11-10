import {
  Body,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { ChatsGateway } from './chats.gateway.js';
import { ChatsService } from './chats.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { ListMessagesDto } from './dto/list-messages.dto.js';

const chatIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Chat no encontrado'),
});

@Controller('chats')
@UseGuards(AuthGuard)
export class ChatsController {
  constructor(
    private readonly chats: ChatsService,
    private readonly gateway: ChatsGateway,
  ) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.chats.listForUser(userId);
  }

  @Post()
  async create(
    @CurrentUserId() userId: string,
    @Body() { participantIds }: CreateChatDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { chat, memberIds, created } = await this.chats.findOrCreate(
      userId,
      participantIds,
    );
    if (created) {
      this.gateway.notifyChatCreated(chat, memberIds);
    } else {
      res.status(HttpStatus.OK);
    }
    return chat;
  }

  @Get(':id/messages')
  listMessages(
    @CurrentUserId() userId: string,
    @Param('id', chatIdPipe) chatId: string,
    @Query() query: ListMessagesDto,
  ) {
    return this.chats.listMessages(chatId, userId, query);
  }
}
