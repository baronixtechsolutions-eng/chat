import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { parseCookie } from 'cookie';
import type { Server, Socket } from 'socket.io';
import {
  type Session,
  SESSION_COOKIE,
  SessionService,
} from '../auth/session.service.js';
import { config } from '../config.js';
import {
  type ChatView,
  ChatsService,
  type MessageView,
} from './chats.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';

type SendMessageAck = { message: MessageView } | { error: string };

const userRoom = (userId: string) => `user:${userId}`;

@WebSocketGateway({ cors: { origin: config.frontendUrl, credentials: true } })
export class ChatsGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() private readonly server: Server;
  private readonly logger = new Logger(ChatsGateway.name);

  constructor(
    private readonly sessions: SessionService,
    private readonly chats: ChatsService,
  ) {}

  afterInit(server: Server) {
    // Reject the handshake itself, so unauthenticated clients never connect
    server.use((socket, next) => {
      const cookies = parseCookie(socket.handshake.headers.cookie ?? '');
      const session = this.sessions.verify(cookies[SESSION_COOKIE]);
      if (!session) {
        next(new Error('unauthorized'));
        return;
      }
      socket.data.session = session;
      next();
    });
  }

  async handleConnection(socket: Socket) {
    // Each user listens on a personal room, so events reach only chat members
    await socket.join(userRoom(this.sessionOf(socket).userId));
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: unknown,
  ): Promise<SendMessageAck> {
    const session = this.sessionOf(socket);
    if (session.expiresAt * 1000 <= Date.now()) {
      socket.disconnect(true);
      return { error: 'Tu sesión ha expirado' };
    }

    if (typeof payload !== 'object' || payload === null) {
      return { error: 'Mensaje no válido' };
    }
    const dto = plainToInstance(SendMessageDto, payload);
    const [invalid] = await validate(dto);
    if (invalid) {
      return { error: Object.values(invalid.constraints ?? {})[0] };
    }

    try {
      const result = await this.chats.addMessage(
        dto.chatId,
        session.userId,
        dto.content,
      );
      if (!result) {
        return { error: 'Chat no encontrado' };
      }
      this.server
        .to(result.memberIds.map(userRoom))
        .emit('message:new', result.message);
      return { message: result.message };
    } catch (error) {
      this.logger.error('Could not store message', error);
      return { error: 'No se pudo enviar el mensaje. Inténtalo de nuevo' };
    }
  }

  notifyChatCreated(chat: ChatView, memberIds: string[]) {
    this.server.to(memberIds.map(userRoom)).emit('chat:new', chat);
  }

  private sessionOf(socket: Socket): Session {
    return socket.data.session as Session;
  }
}
