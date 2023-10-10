import { createHandler as createApolloHttpRequestHandler } from '@/api/apolloHttpRequestHandler';
import { ApiGatewayContextConfig } from '@/api/context/apiGateway';
import { DynamoDbContextConfig } from '@/api/context/dynamoDb';
import { createHandler as createWebSocketSubscriptionHandler } from '@/api/webSocketSubscriptionHandler';
import { mongooseSchema } from '@/schema/mongoose-schema';
import { queryMutationResolvers, subscriptionResolvers } from '@/schema/resolvers';
import typeDefs from '@/schema/typedefs.graphql';
import { createLogger } from '@/utils/logger';
import { WebSocket } from 'ws';

import { MockApiGatewayManagementApiClient } from '../utils/MockApiGatewayManagementApiClient';

export function createEnvLambdaHandlers() {
  const sockets: Record<string, WebSocket> = {};

  const dynamoDb: DynamoDbContextConfig = {
    logger: createLogger('mock:dynamodb'),
    clientConfig: {
      endpoint: process.env.DYNAMODB_ENDPOINT,
      credentials: {
        accessKeyId: 'dummykey123',
        secretAccessKey: 'dummysecretkey123',
      },
    },
    tableNames: {
      connections: 'connections',
      subscriptions: 'subscriptions',
    },
  };

  const apiGateway: ApiGatewayContextConfig = {
    logger: createLogger('mock:apigateway'),
    newClient() {
      return new MockApiGatewayManagementApiClient(sockets);
    },
  };

  const httpRequestHandler = createApolloHttpRequestHandler({
    logger: createLogger('mock:apollo-http-request-handler'),
    graphQl: {
      logger: createLogger('mock:graphql-http'),
      typeDefs,
      resolvers: queryMutationResolvers,
    },
    mongoDb: {
      logger: createLogger('mock:mongodb'),
      schema: mongooseSchema,
      uri: process.env.MONGODB_URI!,
    },
    dynamoDb,
    apiGateway,
  });

  const webSocketHandler = createWebSocketSubscriptionHandler({
    logger: createLogger('mock:websocket-subscription-handler'),
    graphQl: {
      logger: createLogger('mock:graphql-ws'),
      typeDefs,
      resolvers: subscriptionResolvers,
    },
    dynamoDb,
    apiGateway,
    defaultTtl() {
      return Math.floor(Date.now() / 1000) + 1 * 60 * 60;
    },
  });

  return {
    sockets,
    httpRequestHandler,
    webSocketHandler,
  };
}
