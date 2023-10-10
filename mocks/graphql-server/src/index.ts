import { createServer } from 'http';
import path from 'path';

import { buildMongoDbContext } from '@/api/context/mongoDb';
import { Publisher } from '@/api/pubsub/publish';
import { Subscriber } from '@/api/pubsub/subscribe';
import { mongooseSchema } from '@/schema/mongoose-schema';
import {
  MongooseQueryMutationContext,
  MongooseSubscriptionContext,
  queryMutationResolvers,
  subscriptionResolvers,
} from '@/schema/resolvers';
import typeDefs from '@/schema/typedefs.graphql';
import { createLogger } from '@/utils/logger';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import { PubSub } from 'graphql-subscriptions';
import { useServer } from 'graphql-ws/lib/use/ws';
import { WebSocketServer, WebSocket } from 'ws';

const logger = createLogger('mock:graphql-server');

const envPath = path.join(__dirname, './../../../.env.local');
dotenv.config({ path: envPath });
logger.info('env:load', { envPath: envPath.toString() });

(async () => {
  try {
    const httpUrl = new URL(process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL!);
    const wsUrl = new URL(process.env.NEXT_PUBLIC_GRAPHQL_WS_URL!);

    if (wsUrl.port != httpUrl.port) {
      logger.warning(
        'WS URL port is different from HTTP URL port. WS URL port is ignored. Instead HTTP URL port is used.',
        {
          httpUrl,
          wsUrl,
        }
      );
    }

    const app: Express = express();

    const httpServer = createServer(app);
    const wsServer = new WebSocketServer({
      server: httpServer,
      path: wsUrl.pathname,
    });

    wsServer.on('listening', () => {
      logger.info('wsServer:listening', { wsUrl: wsUrl.toString() });
    });
    wsServer.on('connection', (ws: WebSocket) => {
      logger.info('wsServer:connection');

      // ws.on('message', (data) => {
      //   try {
      //     logger.info('ws:message', { data: JSON.parse(data.toString()) });
      //   } catch (err) {
      //     logger.error('ws:message:parseError', err as Error);
      //   }
      // });

      ws.on('error', (err) => {
        logger.error('ws:error', err);
      });

      ws.on('close', (ws) => {
        logger.info('ws:close', { ws });
      });
    });

    const { connection: mongoose } = await buildMongoDbContext({
      uri: process.env.MONGODB_URI!,
      logger: createLogger('mock:mongodb'),
      schema: mongooseSchema,
    });

    const pubsub = new PubSub();
    const publish: Publisher = (topic, payload) => {
      return pubsub.publish(topic, payload);
    };
    const subscribe: Subscriber = (topic: string) => {
      return pubsub.asyncIterator([topic]);
    };

    // Remove resolve field from subscriptions since it won't work with PubSub
    const noResolveFieldSubscriptionResolvers = {
      ...subscriptionResolvers,
      Subscription: Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.entries(subscriptionResolvers.Subscription).map(([key, { resolve, ...rest }]) => [
          key,
          { ...rest },
        ])
      ),
    };

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const subscriptionWsServer = useServer(
      {
        schema: makeExecutableSchema<MongooseSubscriptionContext>({
          typeDefs,
          resolvers: noResolveFieldSubscriptionResolvers,
        }),
        context: async () => ({
          subscribe,
        }),
      },
      wsServer
    );

    const apolloServer = new ApolloServer<MongooseQueryMutationContext>({
      schema: makeExecutableSchema<MongooseQueryMutationContext>({
        typeDefs,
        resolvers: queryMutationResolvers,
      }),
      plugins: [
        // Proper shutdown for the HTTP server.
        ApolloServerPluginDrainHttpServer({ httpServer }),

        // Proper shutdown for the WebSocket server.
        {
          async serverWillStart() {
            return {
              async drainServer() {
                await subscriptionWsServer.dispose();
              },
            };
          },
        },
      ],
    });

    logger.info('index:apollo:start');
    await apolloServer.start();

    app.use(
      httpUrl.pathname,
      cors<cors.CorsRequest>(),
      bodyParser.json(),
      expressMiddleware<MongooseQueryMutationContext>(apolloServer, {
        context: async () => ({
          mongoose,
          publish,
        }),
      })
    );

    httpServer.listen(httpUrl.port, () => {
      logger.info('http:listening', { httpUrl: httpUrl.toString() });
    });

    const gracefulShutdown = async () => {
      logger.info('index:shutdown');
      await apolloServer.stop();
      await mongoose.close();
      httpServer.close();
      process.exit();
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGUSR2', gracefulShutdown);
  } catch (err) {
    logger.error('index', err as Error);
    process.exit(1);
  }
})();
