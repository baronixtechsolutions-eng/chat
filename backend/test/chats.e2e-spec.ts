import type { INestApplication } from '@nestjs/common';
import type { Socket } from 'socket.io-client';
import request from 'supertest';
import {
  connectSocket,
  registerUser,
  startApp,
  type TestUser,
  waitFor,
} from './helpers.js';

describe('Chats and real-time messages', () => {
  let app: INestApplication;
  let ana: TestUser;
  let ben: TestUser;
  let carl: TestUser;
  const sockets: Socket[] = [];

  const connect = async (user?: TestUser) => {
    const socket = connectSocket(app, user?.cookie);
    sockets.push(socket);
    if (user) await waitFor(socket, 'connect');
    return socket;
  };

  const createChat = (user: TestUser, participantIds: string[]) =>
    request(app.getHttpServer())
      .post('/chats')
      .set('Cookie', user.cookie)
      .send({ participantIds });

  beforeAll(async () => {
    app = await startApp();
    ana = await registerUser(app, 'Ana');
    ben = await registerUser(app, 'Ben');
    carl = await registerUser(app, 'Carl');
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await app.close();
  });

  it('rejects socket connections without a valid session', async () => {
    const anonymous = await connect();
    const error = await waitFor<Error>(anonymous, 'connect_error');
    expect(error.message).toBe('unauthorized');

    const forged = connectSocket(app, 'session=forged');
    sockets.push(forged);
    expect((await waitFor<Error>(forged, 'connect_error')).message).toBe(
      'unauthorized',
    );
  });

  it('creates a chat, notifies its members and reuses it for the same members', async () => {
    const benSocket = await connect(ben);
    const notified = waitFor<{ id: string }>(benSocket, 'chat:new');

    const created = await createChat(ana, [ben.id]).expect(201);
    expect(created.body.participants).toHaveLength(2);
    expect((await notified).id).toBe(created.body.id);

    const again = await createChat(ben, [ana.id]).expect(200);
    expect(again.body.id).toBe(created.body.id);
  });

  it('validates chat members', async () => {
    await createChat(ana, []).expect(400);
    await createChat(ana, [ana.id]).expect(400);
    await createChat(ana, ['00000000-0000-4000-8000-000000000000']).expect(400);
    await createChat(ana, ['not-a-uuid']).expect(400);
  });

  it('delivers messages only to chat members', async () => {
    const { body: chat } = await createChat(ana, [ben.id]);
    const anaSocket = await connect(ana);
    const benSocket = await connect(ben);
    const carlSocket = await connect(carl);

    const carlReceived: unknown[] = [];
    carlSocket.on('message:new', (message) => carlReceived.push(message));
    const benReceives = waitFor<{ id: string; content: string }>(
      benSocket,
      'message:new',
    );

    const ack = await anaSocket.emitWithAck('message:send', {
      chatId: chat.id,
      content: '  Hola Ben  ',
    });

    expect(ack.message).toMatchObject({
      chatId: chat.id,
      content: 'Hola Ben',
      sender: { id: ana.id, name: 'Ana' },
      createdAt: expect.any(String),
    });
    const received = await benReceives;
    expect(received.id).toBe(ack.message.id);

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(carlReceived).toEqual([]);
  });

  it('does not let outsiders write to or read from a chat', async () => {
    const { body: chat } = await createChat(ana, [ben.id]);
    const carlSocket = await connect(carl);

    const ack = await carlSocket.emitWithAck('message:send', {
      chatId: chat.id,
      content: 'intruso',
    });
    expect(ack).toEqual({ error: 'Chat no encontrado' });

    await request(app.getHttpServer())
      .get(`/chats/${chat.id}/messages`)
      .set('Cookie', carl.cookie)
      .expect(404);
  });

  it('rejects invalid messages', async () => {
    const { body: chat } = await createChat(ana, [ben.id]);
    const anaSocket = await connect(ana);

    expect(
      await anaSocket.emitWithAck('message:send', {
        chatId: chat.id,
        content: '   ',
      }),
    ).toEqual({ error: 'El mensaje no puede estar vacío' });
    expect(
      await anaSocket.emitWithAck('message:send', {
        chatId: chat.id,
        content: 'x'.repeat(2001),
      }),
    ).toEqual({ error: 'El mensaje no puede superar 2000 caracteres' });
    expect(await anaSocket.emitWithAck('message:send', 'texto')).toEqual({
      error: 'Mensaje no válido',
    });
  });

  it('keeps the history and pages through it', async () => {
    const { body: chat } = await createChat(ana, [ben.id, carl.id]);
    const anaSocket = await connect(ana);
    for (let i = 1; i <= 5; i++) {
      await anaSocket.emitWithAck('message:send', {
        chatId: chat.id,
        content: `mensaje ${i}`,
      });
    }

    const firstPage = await request(app.getHttpServer())
      .get(`/chats/${chat.id}/messages?limit=3`)
      .set('Cookie', carl.cookie)
      .expect(200);
    expect(firstPage.body.hasMore).toBe(true);
    expect(
      firstPage.body.messages.map((m: { content: string }) => m.content),
    ).toEqual(['mensaje 3', 'mensaje 4', 'mensaje 5']);

    const secondPage = await request(app.getHttpServer())
      .get(
        `/chats/${chat.id}/messages?limit=3&before=${firstPage.body.messages[0].id}`,
      )
      .set('Cookie', carl.cookie)
      .expect(200);
    expect(secondPage.body).toMatchObject({ hasMore: false });
    expect(
      secondPage.body.messages.map((m: { content: string }) => m.content),
    ).toEqual(['mensaje 1', 'mensaje 2']);

    const list = await request(app.getHttpServer())
      .get('/chats')
      .set('Cookie', carl.cookie)
      .expect(200);
    expect(list.body[0]).toMatchObject({
      id: chat.id,
      lastMessage: { content: 'mensaje 5', sender: { name: 'Ana' } },
    });
  });
});
