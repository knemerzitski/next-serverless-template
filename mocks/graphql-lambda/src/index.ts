import path from 'path';

import { createLogger } from '@/utils/logger';
import dotenv from 'dotenv';

import { createLambdaGraphQlServer } from './createLambdaGraphQlServer';
import { createEnvLambdaHandlers } from './handlers/createEnvLambdaHandlersContext';

const logger = createLogger('mock:lambda-graphql-server');

const envPath = path.join(__dirname, './../../../.env.local');
dotenv.config({ path: envPath });
logger.info('env:load', { envPath: envPath.toString() });

(async () => {
  try {
    const server = await createLambdaGraphQlServer({
      handlerContext: createEnvLambdaHandlers(),
      httpUrl: new URL(process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL!),
      wsUrl: new URL(process.env.NEXT_PUBLIC_GRAPHQL_WS_URL!),
      logger,
    });

    const gracefulShutdown = async () => {
      logger.info('index:shutdown');
      server.stop();
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
