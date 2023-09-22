import { readFileSync } from 'fs';
import { createServer } from 'http';
import path from 'path';

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import { useServer } from 'graphql-ws/lib/use/ws';
import mongoose from 'mongoose';
import { WebSocketServer } from 'ws';

import resolvers from '@graphql/mongoose-resolvers';

dotenv.config({ path: path.join(__dirname, './../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI!;
const PORT = process.env.PORT ?? 4000;

const WS_PATH = '/graphql';
const GRAPHQL_PATH = '/graphql';

console.log(`Environment is ${process.env.NODE_ENV ?? 'development'}`);

const typeDefs = readFileSync(path.join(__dirname, './../graphql/schema.graphql'), 'utf-8');

const app: Express = express();
const httpServer = createServer(app);
const wsServer = new WebSocketServer({
  server: httpServer,
  path: WS_PATH,
});

// wsServer.on('connection', (ws: WebSocket) => {
//   console.log('new ws connection');
//   ws.on('error', console.error);

//   ws.on('message', (data) => {
//     console.log(`recevied: ${data}`);
//   });
// });

const schema = makeExecutableSchema({ typeDefs, resolvers });

// eslint-disable-next-line react-hooks/rules-of-hooks
const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer({
  schema,
  plugins: [
    // Proper shutdown for the HTTP server.
    ApolloServerPluginDrainHttpServer({ httpServer }),

    // Proper shutdown for the WebSocket server.
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log(`Mongoose connected to ${MONGODB_URI}`);

    console.log('Starting Apollo Server');
    await server.start();

    app.use(GRAPHQL_PATH, cors<cors.CorsRequest>(), bodyParser.json(), expressMiddleware(server));

    httpServer.listen(PORT, () => {
      console.log(`HTTP listening on http://localhost:${PORT}${GRAPHQL_PATH}`);
      console.log(`Websocket listening on ws://localhost:${PORT}${WS_PATH}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

async function gracefulShutdown() {
  console.log('Shutting down');
  await mongoose.disconnect();
  process.exit();
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);
