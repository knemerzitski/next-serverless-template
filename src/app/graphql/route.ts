import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';

import resolvers from '@/app/graphql/mongoose-resolvers';
import typeDefs from '@/app/graphql/schema.graphql';

const MONGODB_URI = process.env.MONGODB_URI!;

let db: typeof mongoose | undefined;

async function assertDbConnected() {
  if (!db) {
    db = await mongoose.connect(MONGODB_URI);
  }
  return db;
}

const server = new ApolloServer({
  resolvers,
  typeDefs,
});

const handler = startServerAndCreateNextHandler<NextRequest>(server, {
  async context(req) {
    await assertDbConnected();

    return { req };
  },
});

export { handler as GET, handler as POST };
