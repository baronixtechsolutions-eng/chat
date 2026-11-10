import { existsSync } from 'node:fs';

// Variables already set in the environment (Docker, CI) take precedence over .env
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  jwtSecret,
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
};
