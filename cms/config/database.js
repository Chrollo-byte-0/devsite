// Producción: Postgres (DATABASE_URL). Local: SQLite por defecto.
module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  if (client === 'postgres') {
    return {
      connection: {
        client: 'postgres',
        connection: {
          connectionString: env('DATABASE_URL'),
          ssl: env.bool('DATABASE_SSL', true) ? { rejectUnauthorized: false } : false,
        },
        pool: { min: 0, max: 10 },
      },
    };
  }

  return {
    connection: {
      client: 'sqlite',
      connection: { filename: env('DATABASE_FILENAME', '.tmp/data.db') },
      useNullAsDefault: true,
    },
  };
};
