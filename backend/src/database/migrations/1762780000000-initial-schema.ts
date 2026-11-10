import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1762780000000 implements MigrationInterface {
  name = 'InitialSchema1762780000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(50) NOT NULL,
        email varchar(254) NOT NULL UNIQUE,
        password_hash varchar NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE chats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at timestamptz NOT NULL DEFAULT now(),
        last_activity_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE chat_participants (
        chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (chat_id, user_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_chat_participants_user ON chat_participants (user_id)`,
    );
    await queryRunner.query(`
      CREATE TABLE messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_messages_chat_created ON messages (chat_id, created_at)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE messages`);
    await queryRunner.query(`DROP TABLE chat_participants`);
    await queryRunner.query(`DROP TABLE chats`);
    await queryRunner.query(`DROP TABLE users`);
  }
}
