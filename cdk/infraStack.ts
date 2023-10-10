import path from 'path';

import { WebSocketApi, WebSocketStage } from '@aws-cdk/aws-apigatewayv2-alpha';
import { WebSocketLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Cors, EndpointType, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

import { createCdkTableConstructs } from '@/schema/dynamodb-schema';

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // TODO check for required environment variables

    const tables = createCdkTableConstructs(this);

    const webSocketSubscriptionLambda = new NodejsFunction(this, 'WebSocketSubscriptionHandler', {
      entry: path.join(__dirname, './../src/api/graphql-lambda/webSocketSubscriptionHandler.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      bundling: {
        externalModules: ['@aws-sdk/*'],
        tsconfig: path.join(__dirname, './tsconfig.json'),
        minify: true,
        loader: {
          '.graphql': 'text',
        },
      },
      environment: {
        // TODO update environment vars
        CONNECTIONS_TABLE_NAME: tables.connections.tableName,
      },
    });

    const apolloHttpRequestLambda = new NodejsFunction(this, 'ApolloHttpRequestHandler', {
      entry: path.join(__dirname, './../src/api/graphql-lambda/apolloHttpRequestHandler.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.seconds(10),
      memorySize: 128,
      bundling: {
        externalModules: ['@aws-sdk/*'],
        tsconfig: path.join(__dirname, './../tsconfig.json'),
        minify: true,
        loader: {
          '.graphql': 'text',
        },
      },
      environment: {
        // TODO update environment vars
        MONGODB_URI: 'mongodb://root:example@host.docker.internal:27017/mongo?authSource=admin',
      },
    });

    const webSocketApi = new WebSocketApi(this, 'WebSocketApi', {
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          'WsConnectIntegration',
          webSocketSubscriptionLambda
        ),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          'WsDisconnectIntegration',
          webSocketSubscriptionLambda
        ),
      },
    });

    /* const webSocketStage =  */ new WebSocketStage(this, 'WebSocketStage', {
      webSocketApi: webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    const restApi = new RestApi(this, 'RestApi', {
      endpointTypes: [EndpointType.REGIONAL],
      deployOptions: {
        stageName: 'prod',
      },
      deploy: true,
      defaultCorsPreflightOptions: {
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowOrigins: Cors.ALL_ORIGINS,
      },
    });

    const graphqlResource = restApi.root.addResource('graphql');
    ['POST', 'GET'].forEach((method) => {
      graphqlResource.addMethod(method, new LambdaIntegration(apolloHttpRequestLambda));
    });
  }
}
