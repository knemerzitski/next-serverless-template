import { Connection, Schema, createConnection } from 'mongoose';

import { Logger } from '../../utils/logger';

export interface MongoDbContextConfig {
  uri: string;
  schema: Record<string, Schema>;
  logger: Logger;
}

export interface MongoDbContext {
  connection: Connection;
}

export async function buildMongoDbContext(config: MongoDbContextConfig): Promise<MongoDbContext> {
  config.logger.info('buildMongoDbContext:createConnection', {
    uri: config.uri,
  });
  const newConn = createConnection(config.uri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    const connection = await newConn.asPromise();

    Object.entries(config.schema).forEach(([name, schema]) => connection.model(name, schema));

    return {
      connection,
    };
  } catch (err) {
    config.logger.error('buildMongoDbContext:connect', err as Error);
    throw err;
  }
}
