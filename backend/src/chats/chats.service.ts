import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UsersService } from '../users/users.service.js';
import { Chat } from './chat.entity.js';
import { Message } from './message.entity.js';

export interface UserSummary {
  id: string;
  name: string;
}

export interface MessageView {
  id: string;
  chatId: string;
  content: string;
  createdAt: Date;
  sender: UserSummary;
}

export interface ChatView {
  id: string;
  participants: UserSummary[];
  lastMessage: MessageView | null;
  lastActivityAt: Date;
}

const DEFAULT_PAGE_SIZE = 50;

function toMessageView(message: Message): MessageView {
  return {
    id: message.id,
    chatId: message.chatId,
    content: message.content,
    createdAt: message.createdAt,
    sender: { id: message.sender.id, name: message.sender.name },
  };
}

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat) private readonly chats: Repository<Chat>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly users: UsersService,
  ) {}

  async listForUser(userId: string): Promise<ChatView[]> {
    const chats = await this.chats
      .createQueryBuilder('chat')
      .innerJoin('chat.participants', 'me', 'me.id = :userId', { userId })
      .leftJoinAndSelect('chat.participants', 'participant')
      .orderBy('chat.lastActivityAt', 'DESC')
      .getMany();
    return this.toViews(chats);
  }

  /**
   * Returns the chat with exactly these members if it already exists, so two
   * users never end up with duplicated conversations.
   */
  async findOrCreate(
    userId: string,
    participantIds: string[],
  ): Promise<{ chat: ChatView; memberIds: string[]; created: boolean }> {
    const others = [...new Set(participantIds)].filter((id) => id !== userId);
    if (others.length === 0) {
      throw new BadRequestException('Selecciona al menos otro usuario');
    }
    if ((await this.users.countByIds(others)) !== others.length) {
      throw new BadRequestException('Alguno de los usuarios no existe');
    }

    const memberIds = [userId, ...others];
    const existingId = await this.findChatWithMembers(memberIds);
    if (existingId) {
      return {
        chat: await this.getView(existingId),
        memberIds,
        created: false,
      };
    }

    const chatId = await this.dataSource.transaction(async (manager) => {
      const chat = await manager.save(manager.create(Chat, {}));
      await manager
        .createQueryBuilder()
        .relation(Chat, 'participants')
        .of(chat)
        .add(memberIds);
      return chat.id;
    });
    return { chat: await this.getView(chatId), memberIds, created: true };
  }

  async listMessages(
    chatId: string,
    userId: string,
    { before, limit = DEFAULT_PAGE_SIZE }: { before?: string; limit?: number },
  ) {
    await this.assertParticipant(chatId, userId);

    const query = this.messages
      .createQueryBuilder('message')
      .innerJoinAndSelect('message.sender', 'sender')
      .where('message.chatId = :chatId', { chatId })
      .orderBy('message.createdAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .limit(limit + 1);

    if (before) {
      // Compare in SQL: timestamptz keeps microseconds, JS dates do not
      query.andWhere(
        `(message.createdAt, message.id) < (
          SELECT cursor.created_at, cursor.id FROM messages cursor
           WHERE cursor.id = :before AND cursor.chat_id = :chatId)`,
        { before },
      );
    }

    const rows = await query.getMany();
    const hasMore = rows.length > limit;
    return {
      messages: rows.slice(0, limit).reverse().map(toMessageView),
      hasMore,
    };
  }

  /** Returns null when the sender is not a participant of the chat. */
  async addMessage(chatId: string, senderId: string, content: string) {
    const memberIds = await this.memberIds(chatId);
    if (!memberIds.includes(senderId)) {
      return null;
    }

    const message = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(
        manager.create(Message, { chatId, senderId, content }),
      );
      await manager.update(Chat, chatId, { lastActivityAt: saved.createdAt });
      return saved;
    });

    const sender = await this.users.findById(senderId);
    message.sender = sender!;
    return { message: toMessageView(message), memberIds };
  }

  private async assertParticipant(chatId: string, userId: string) {
    const memberIds = await this.memberIds(chatId);
    // Same response whether the chat does not exist or belongs to others
    if (!memberIds.includes(userId)) {
      throw new NotFoundException('Chat no encontrado');
    }
  }

  private async memberIds(chatId: string): Promise<string[]> {
    const rows: { user_id: string }[] = await this.dataSource.query(
      'SELECT user_id FROM chat_participants WHERE chat_id = $1',
      [chatId],
    );
    return rows.map((row) => row.user_id);
  }

  private async findChatWithMembers(memberIds: string[]) {
    const rows: { chat_id: string }[] = await this.dataSource.query(
      `SELECT chat_id
         FROM chat_participants
        WHERE chat_id IN (SELECT chat_id FROM chat_participants WHERE user_id = $1)
        GROUP BY chat_id
       HAVING COUNT(*) = $2
          AND COUNT(*) FILTER (WHERE user_id = ANY($3::uuid[])) = $2
        LIMIT 1`,
      [memberIds[0], memberIds.length, memberIds],
    );
    return rows[0]?.chat_id ?? null;
  }

  private async getView(chatId: string): Promise<ChatView> {
    const chat = await this.chats.findOneOrFail({
      where: { id: chatId },
      relations: { participants: true },
    });
    const [view] = await this.toViews([chat]);
    return view;
  }

  private async toViews(chats: Chat[]): Promise<ChatView[]> {
    if (chats.length === 0) return [];

    const lastMessages = await this.messages
      .createQueryBuilder('message')
      .distinctOn(['message.chatId'])
      .innerJoinAndSelect('message.sender', 'sender')
      .where('message.chatId IN (:...ids)', { ids: chats.map((c) => c.id) })
      .orderBy('message.chatId')
      .addOrderBy('message.createdAt', 'DESC')
      .getMany();
    const lastByChat = new Map(lastMessages.map((m) => [m.chatId, m]));

    return chats.map((chat) => {
      const last = lastByChat.get(chat.id);
      return {
        id: chat.id,
        participants: chat.participants.map(({ id, name }) => ({ id, name })),
        lastMessage: last ? toMessageView(last) : null,
        lastActivityAt: chat.lastActivityAt,
      };
    });
  }
}
