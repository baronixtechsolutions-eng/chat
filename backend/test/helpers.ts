import type { INestApplication } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

export async function startApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.listen(0);
  await app.get(DataSource).query('TRUNCATE users, chats CASCADE');
  return app;
}

export function baseUrl(app: INestApplication) {
  const address = app.getHttpServer().address() as { port: number };
  return `http://localhost:${address.port}`;
}

export interface TestUser {
  id: string;
  name: string;
  cookie: string;
}

export async function registerUser(
  app: INestApplication,
  name: string,
): Promise<TestUser> {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      name,
      email: `${name.toLowerCase()}@test.com`,
      password: 'password123',
    })
    .expect(201);
  const cookie = res.get('Set-Cookie')![0].split(';')[0];
  return { id: res.body.id, name, cookie };
}

export function connectSocket(app: INestApplication, cookie?: string): Socket {
  return io(baseUrl(app), {
    transports: ['websocket'],
    extraHeaders: cookie ? { cookie } : {},
    reconnection: false,
  });
}

export function waitFor<T>(
  socket: Socket,
  event: string,
  ms = 2000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout: ${event}`)), ms);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
