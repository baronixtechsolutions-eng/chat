import pg from 'pg';

// Creates the test database the first time, so the suite runs on a fresh Postgres
export default async function createTestDatabase() {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  const name = decodeURIComponent(url.pathname.slice(1));
  url.pathname = '/postgres';

  const client = new pg.Client({ connectionString: url.toString() });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `No se pudo conectar a PostgreSQL en ${url.host} para preparar la base de tests: ${(error as Error).message}`,
    );
  }

  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [name],
    );
    if (!rowCount) {
      await client.query(`CREATE DATABASE "${name.replaceAll('"', '""')}"`);
    }
  } catch (error) {
    throw new Error(
      `No se pudo crear la base de tests "${name}". Créala a mano (createdb ${name}) o usa un usuario con permiso CREATEDB: ${(error as Error).message}`,
    );
  } finally {
    await client.end();
  }
}
