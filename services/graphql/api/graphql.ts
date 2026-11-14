import { createYoga } from 'graphql-yoga';
import { schema, buildContext } from '../lib/schema.ts';

const allowed = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  // GraphiQL queda disponible; el contenido que expone ya es público.
  graphiql: true,
  context: () => buildContext(),
  cors: {
    origin: allowed,
    methods: ['GET', 'POST', 'OPTIONS'],
  },
  maskedErrors: process.env.NODE_ENV === 'production',
});

export { yoga as GET, yoga as POST, yoga as OPTIONS };
