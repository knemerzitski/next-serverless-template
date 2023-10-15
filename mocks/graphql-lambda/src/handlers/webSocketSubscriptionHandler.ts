import { randomUUID } from 'crypto';

import { Logger } from '@/utils/logger';
import {
  APIGatewayEventWebsocketRequestContextV2,
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyWebsocketHandlerV2,
} from 'aws-lambda';
import { WebSocket } from 'ws';

import apiGatewayProxyWebsocketEventV2Fixture from '../../fixtures/apiGatewayProxyWebsocketEventV2.json';
import { createLambdaContext } from '../utils/createLambdaContext';

export function webSocketSubscriptionHandler({
  sockets,
  logger,
  handler,
}: {
  handler: APIGatewayProxyWebsocketHandlerV2;
  sockets: Record<string, WebSocket>;
  logger: Logger;
}) {
  return (ws: WebSocket) => {
    const id = randomUUID();
    sockets[id] = ws;

    logger.info('wsServer:connection', {
      id,
    });

    handler(createApiGatewayProxyWebSocketEventV2(id, 'CONNECT'), createLambdaContext(), () => {});

    ws.on('message', (data) => {
      // try {
      //   logger.info('ws:message', { data: JSON.parse(data.toString()) });
      // } catch (err) {
      //   logger.error('ws:message:parseError', err as Error);
      // }
      handler(
        createApiGatewayProxyWebSocketEventV2(id, 'MESSAGE', data.toString()),
        createLambdaContext(),
        () => {}
      );
    });

    ws.on('error', (err) => {
      logger.error('ws:error', err, { id });
    });

    ws.on('close', () => {
      logger.info('ws:close', {
        id,
      });
      handler(
        createApiGatewayProxyWebSocketEventV2(id, 'DISCONNECT'),
        createLambdaContext(),
        () => {}
      );

      delete sockets[id];
    });

    ws.on('ping', () => {
      logger.info('ws:ping', {
        id,
      });
    });

    ws.on('pong', () => {
      logger.info('ws:ping', {
        id,
      });
    });

    ws.on('unexpected-response', (data) => {
      logger.info('ws:unexpected-response', { id, data });
    });

    ws.on('close', (ws) => {
      logger.info('ws:close', { id, ws });
    });
  };
}

function createApiGatewayProxyWebSocketEventV2(
  connectionId: APIGatewayEventWebsocketRequestContextV2['connectionId'],
  eventType: APIGatewayEventWebsocketRequestContextV2['eventType'],
  message?: APIGatewayProxyWebsocketEventV2['body']
): APIGatewayProxyWebsocketEventV2 {
  const eventCopy: typeof apiGatewayProxyWebsocketEventV2Fixture = JSON.parse(
    JSON.stringify(apiGatewayProxyWebsocketEventV2Fixture)
  );
  return {
    ...eventCopy,
    body: message,
    requestContext: {
      ...eventCopy.requestContext,
      eventType,
      connectionId,
      messageDirection: 'IN',
    },
  };
}
