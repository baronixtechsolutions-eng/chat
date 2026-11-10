import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { registerUser, startApp } from './helpers.js';

describe('Auth', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user and opens an httpOnly session', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: ' Ana ', email: 'Ana@Test.com', password: 'password123' })
      .expect(201);

    expect(res.body).toEqual({
      id: expect.any(String),
      name: 'Ana',
      email: 'ana@test.com',
    });
    const cookie = res.get('Set-Cookie')![0];
    expect(cookie).toMatch(/^session=/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('rejects an email that is already registered, ignoring case', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Otra', email: 'ANA@test.com', password: 'password123' })
      .expect(409);
    expect(res.body.message).toBe('Ya existe una cuenta con este correo');
  });

  it('returns field errors for empty or malformed data', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: '', email: 'no-es-correo', password: '123' })
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([
        'El nombre es obligatorio',
        'El correo no tiene un formato válido',
        'La contraseña debe tener al menos 8 caracteres',
      ]),
    );
  });

  it('rejects unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Eve',
        email: 'eve@test.com',
        password: 'password123',
        role: 'admin',
      })
      .expect(400);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@test.com', password: 'wrong-password' })
      .expect(401);
    const unknownEmail = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nadie@test.com', password: 'wrong-password' })
      .expect(401);
    expect(wrongPassword.body.message).toBe('Correo o contraseña incorrectos');
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });

  it('logs in, reads the session and logs out', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@test.com', password: 'password123' })
      .expect(200);
    const cookie = login.get('Set-Cookie')![0].split(';')[0];

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(me.body.email).toBe('ana@test.com');
    expect(me.body).not.toHaveProperty('passwordHash');

    const logout = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookie)
      .expect(204);
    expect(logout.get('Set-Cookie')![0]).toMatch(/^session=;/);
  });

  it('protects private routes', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer()).get('/users').expect(401);
    await request(app.getHttpServer()).get('/chats').expect(401);
    await request(app.getHttpServer())
      .get('/users')
      .set('Cookie', 'session=forged.token.value')
      .expect(401);
  });

  it('lists the other users without password data', async () => {
    const ben = await registerUser(app, 'Ben');
    const res = await request(app.getHttpServer())
      .get('/users')
      .set('Cookie', ben.cookie)
      .expect(200);
    expect(res.body).toEqual([
      { id: expect.any(String), name: 'Ana', email: 'ana@test.com' },
    ]);
  });
});
