import { HTTPGraphQLRequest, HeaderMap } from '@apollo/server';
import { ApolloServer } from '@apollo/server';
import { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { APIGatewayProxyEvent } from 'aws-lambda';

import { mongooseSchema } from '../schema/mongoose-schema';
import { MongooseQueryMutationContext, queryMutationResolvers } from '../schema/resolvers';
import typeDefs from '../schema/typedefs.graphql';
import { Logger, createLogger } from '../utils/logger';

import { ApiGatewayContextConfig, buildApiGatewayContext } from './context/apiGateway';
import { DynamoDbContextConfig, buildDynamoDbContext } from './context/dynamoDb';
import { GraphQlContextConfig, buildGraphQlContext } from './context/graphQl';
import { MongoDbContext, MongoDbContextConfig, buildMongoDbContext } from './context/mongoDb';
import { createPublisher } from './pubsub/publish';

export interface ApolloHttpRequestHandlerContextConfig {
  graphQl: GraphQlContextConfig<MongooseQueryMutationContext>;
  mongoDb: MongoDbContextConfig;
  dynamoDb: DynamoDbContextConfig;
  apiGateway: ApiGatewayContextConfig;
  logger: Logger;
}

export function getDefaultConfig(): ApolloHttpRequestHandlerContextConfig {
  const logger = createLogger('apollo-websocket-handler');
  return {
    logger,
    graphQl: {
      logger,
      typeDefs,
      resolvers: queryMutationResolvers,
    },
    mongoDb: {
      logger,
      schema: mongooseSchema,
      uri: process.env.MONGODB_URI!,
    },
    dynamoDb: {
      logger,
      clientConfig: {
        region: process.env.DYNAMODB_REGION!,
      },
      tableNames: {
        connections: process.env.CONNECTIONS_TABLE_NAME!,
        subscriptions: process.env.SUBSCRIPTIONS_TABLE_NAME!,
      },
    },
    apiGateway: {
      logger,
      newClient(config) {
        return new ApiGatewayManagementApiClient({
          ...config,
          region: process.env.API_GATEWAY_MANAGEMENT_REGION!,
        });
      },
    },
  };
}

const defaultResponse: APIGatewayProxyResult = {
  statusCode: 200,
  body: '',
};

export function createHandler(
  config: ApolloHttpRequestHandlerContextConfig
): APIGatewayProxyHandler {
  const graphQl = buildGraphQlContext<MongooseQueryMutationContext>(config.graphQl);
  const dynamoDb = buildDynamoDbContext(config.dynamoDb);
  let mongoDb: MongoDbContext;
  const apiGateway = buildApiGatewayContext(config.apiGateway);

  const logger = config.logger;

  const apollo = new ApolloServer<MongooseQueryMutationContext>({
    schema: graphQl.schema,
  });

  apollo.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

  const publish = createPublisher({ logger, graphQl, apiGateway, dynamoDb });

  return async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;

    try {
      if (!mongoDb) {
        mongoDb = await buildMongoDbContext(config.mongoDb);
      }

      const httpGraphQLRequest = parseEvent(event);

      const res = await apollo.executeHTTPGraphQLRequest({
        httpGraphQLRequest,
        context: async () => ({
          mongoose: mongoDb.connection,
          publish,
        }),
      });

      if (res.body.kind !== 'complete') {
        throw new Error(`Only complete body type supported. Is "${res.body.kind}"`);
      }

      return {
        statusCode: res.status ?? 200,
        headers: {
          ...Object.fromEntries(res.headers),
          'content-length': Buffer.byteLength(res.body.string).toString(),
        },
        body: res.body.string,
      };
    } catch (err) {
      logger.error('apolloHttpRequestHandler', err as Error);
      return defaultResponse;
    }
  };
}

export const handler: APIGatewayProxyHandler = createHandler(getDefaultConfig());

function parseHeaders(event: APIGatewayProxyEvent) {
  const headerMap = new HeaderMap();
  for (const [key, value] of Object.entries(event.headers ?? {})) {
    headerMap.set(key, value ?? '');
  }
  return headerMap;
}

function parseBody(event: APIGatewayProxyEvent, headers: HeaderMap) {
  if (event.body) {
    const contentType = headers.get('content-type');
    const parsedBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    if (contentType?.startsWith('application/json')) {
      return JSON.parse(parsedBody);
    }
    if (contentType?.startsWith('text/plain')) {
      return parsedBody;
    }
  }
  return '';
}

function parseQueryParams(event: APIGatewayProxyEvent) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(event.multiValueQueryStringParameters ?? {})) {
    for (const v of value ?? []) {
      params.append(key, decodeURIComponent(v));
    }
  }
  return params.toString();
}

function parseEvent(event: APIGatewayProxyEvent): HTTPGraphQLRequest {
  const headers = parseHeaders(event);
  return {
    method: event.httpMethod,
    headers,
    search: parseQueryParams(event),
    body: parseBody(event, headers),
  };
}
