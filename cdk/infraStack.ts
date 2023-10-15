import path from 'path';

import { WebSocketApi, WebSocketStage } from '@aws-cdk/aws-apigatewayv2-alpha';
import { WebSocketLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Fn } from 'aws-cdk-lib';
import { Cors, EndpointType, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  Function,
  FunctionCode,
  FunctionEventType,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  OriginRequestCookieBehavior,
  OriginRequestHeaderBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
  PriceClass,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, RestApiOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget, Route53RecordTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
  BucketDeployment,
  BucketDeploymentProps,
  CacheControl,
  Source,
} from 'aws-cdk-lib/aws-s3-deployment';
import {
  AtlasBasic,
  CfnDatabaseUserPropsAwsiamType,
  AdvancedRegionConfigProviderName,
} from 'awscdk-resources-mongodbatlas';
import { Construct } from 'constructs';

import { transpileTypeScriptAsFile } from './cloudfront-functions/transpile';
import { getOrCreateResource } from './utils/getOrCreateResource';
import { parseDomains } from './utils/parseDomains';

import { createCdkTableConstructs } from '@/schema/dynamodb-schema';

const REQUIRED_ENVIRONMENT_VARIABLES = [
  'DOMAINS',
  'CLOUDFRONT_CERTIFICATE_ARN',

  'MONGODB_ATLAS_ORG_ID',

  // Require project and cluster name on deployment to prevent creating and deleting project every time
  'MONGODB_ATLAS_PROJECT_NAME',
  'MONGODB_ATLAS_CLUSTER_NAME',

  'MONGODB_ATLAS_DATABASE_NAME',
];

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    REQUIRED_ENVIRONMENT_VARIABLES.forEach((name) => {
      if (!(name in process.env)) {
        throw new Error(
          `Environment variable "${name}" is not defined. It can be defined at project root in file ".env.local"`
        );
      }
    });
    const DOMAINS = parseDomains(process.env.DOMAINS!);

    const dynamoDbWebSocketTables = createCdkTableConstructs(this, 'WebSocketTables');

    const apolloHttpRequestLambda = new NodejsFunction(this, 'ApolloHttpRequestHandler', {
      entry: path.join(__dirname, './../src/api/apolloHttpRequestHandler.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.seconds(10),
      memorySize: 176,
      bundling: {
        externalModules: ['@aws-sdk/*'],
        tsconfig: path.join(__dirname, './tsconfig.json'),
        minify: true,
        sourceMap: true,
        loader: {
          '.graphql': 'text',
        },
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV ?? 'production',
        NODE_OPTIONS: '--enable-source-maps',
        DEBUG: process.env.DEBUG ?? '*',

        STS_REGION: process.env.STS_REGION ?? '',
        MONGODB_ATLAS_DATABASE_NAME: process.env.MONGODB_ATLAS_DATABASE_NAME!,

        DYNAMODB_REGION: process.env.DYNAMODB_REGION ?? '',
        DYNAMODB_CONNECTIONS_TABLE_NAME: dynamoDbWebSocketTables.connections.tableName,
        DYNAMODB_SUBSCRIPTIONS_TABLE_NAME: dynamoDbWebSocketTables.subscriptions.tableName,

        API_GATEWAY_MANAGEMENT_REGION: process.env.API_GATEWAY_MANAGEMENT_REGION ?? '',
      },
    });
    dynamoDbWebSocketTables.connections.grantReadData(apolloHttpRequestLambda);
    dynamoDbWebSocketTables.subscriptions.grantReadData(apolloHttpRequestLambda);

    const mongoDbAtlasAuthRole = new Role(this, 'MongoDbAtlasAuthRole', {
      assumedBy: apolloHttpRequestLambda.grantPrincipal,
    });
    apolloHttpRequestLambda.addEnvironment('MONGODB_ATLAS_ROLE_ARN', mongoDbAtlasAuthRole.roleArn);

    const mongoDbAtlas = new AtlasBasic(this, 'MongoDbAtlasBasic', {
      profile: process.env.MONGODB_ATLAS_PROFILE,
      projectProps: {
        orgId: process.env.MONGODB_ATLAS_ORG_ID!,
        name: process.env.MONGODB_ATLAS_PROJECT_NAME!,
      },
      dbUserProps: {
        // User is created externally (IAM Role)
        databaseName: '$external',
        awsiamType: CfnDatabaseUserPropsAwsiamType.ROLE,
        username: mongoDbAtlasAuthRole.roleArn,
        // Must set password undefined so that only IAM Role authentication is available
        password: undefined,
      },
      ipAccessListProps: {
        accessList: [{ cidrBlock: '0.0.0.0/0', comment: 'Allow access from anywhere' }],
      },
      clusterProps: {
        // Free tier M0 Cluster
        name: process.env.MONGODB_ATLAS_CLUSTER_NAME!,
        clusterType: 'REPLICASET',
        replicationSpecs: [
          {
            numShards: 1,
            advancedRegionConfigs: [
              {
                regionName: process.env.MONGODB_ATLAS_REGION,
                providerName: AdvancedRegionConfigProviderName.TENANT,
                backingProviderName: 'AWS',
                priority: 7,
                electableSpecs: {
                  ebsVolumeType: 'STANDARD',
                  instanceSize: 'M0',
                  nodeCount: 3,
                },
                analyticsSpecs: {
                  ebsVolumeType: 'STANDARD',
                  instanceSize: 'M0',
                  nodeCount: 1,
                },
              },
            ],
          },
        ],
      },
    });

    apolloHttpRequestLambda.addEnvironment(
      'MONGODB_ATLAS_URI_SRV',
      mongoDbAtlas.mCluster.connectionStrings.standardSrv!
    );

    const webSocketSubscriptionLambda = new NodejsFunction(this, 'WebSocketSubscriptionHandler', {
      entry: path.join(__dirname, './../src/api/webSocketSubscriptionHandler.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.seconds(3),
      memorySize: 128,
      bundling: {
        externalModules: ['@aws-sdk/*'],
        tsconfig: path.join(__dirname, './tsconfig.json'),
        minify: true,
        sourceMap: true,
        loader: {
          '.graphql': 'text',
        },
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV ?? 'production',
        NODE_OPTIONS: '--enable-source-maps',
        DEBUG: process.env.DEBUG ?? '*',

        DYNAMODB_REGION: process.env.DYNAMODB_REGION ?? '',
        DYNAMODB_CONNECTIONS_TABLE_NAME: dynamoDbWebSocketTables.connections.tableName,
        DYNAMODB_SUBSCRIPTIONS_TABLE_NAME: dynamoDbWebSocketTables.subscriptions.tableName,

        API_GATEWAY_MANAGEMENT_REGION: process.env.API_GATEWAY_MANAGEMENT_REGION ?? '',
      },
    });
    dynamoDbWebSocketTables.connections.grantReadWriteData(webSocketSubscriptionLambda);
    dynamoDbWebSocketTables.subscriptions.grantReadWriteData(webSocketSubscriptionLambda);

    const restApi = new RestApi(this, 'RestApi', {
      restApiName: 'Todo App RestApi',
      description: 'Serves GraphQL Requests for Todo App',
      endpointTypes: [EndpointType.REGIONAL],
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 50,
        throttlingRateLimit: 500,
      },
      deploy: true,
      defaultCorsPreflightOptions: {
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowOrigins: Cors.ALL_ORIGINS,
      },
    });

    const apiUrl = new URL(process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL!);

    const graphQlResource = getOrCreateResource(
      restApi.root,
      apiUrl.pathname.split('/').filter((p) => p.trim().length > 0)
    );
    ['POST', 'GET'].forEach((method) => {
      graphQlResource.addMethod(method, new LambdaIntegration(apolloHttpRequestLambda));
    });

    const webSocketApi = new WebSocketApi(this, 'WebSocketApi', {
      apiName: 'Todo App WebSocketApi',
      description: 'Handles GraphQL Subscriptions for Todo App',
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          'WsConnectIntegration',
          webSocketSubscriptionLambda
        ),
      },
      defaultRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          'WsDefaultIntegration',
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

    const webSocketUrl = new URL(process.env.NEXT_PUBLIC_GRAPHQL_WS_URL!);

    // WebSocket API stageName cannot contain any slashes
    const webSocketStageName = webSocketUrl.pathname.substring(1);
    if (webSocketStageName.includes('/')) {
      throw new Error(
        `"NEXT_PUBLIC_GRAPHQL_WS_URL" pathname cannot contain any slashes: ${webSocketStageName}`
      );
    }

    const webSocketStage = new WebSocketStage(this, 'WebSocketStage', {
      webSocketApi: webSocketApi,
      stageName: webSocketStageName,
      autoDeploy: true,
      throttle: {
        rateLimit: 500,
        burstLimit: 50,
      },
    });
    webSocketStage.grantManagementApiAccess(webSocketSubscriptionLambda);
    webSocketStage.grantManagementApiAccess(apolloHttpRequestLambda);

    const staticFilesBucket = new Bucket(this, 'AppStaticFiles', {
      versioned: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'SecureResponseHeadersPolicy', {
      comment: 'Adds a set of security headers to every response',
      securityHeadersBehavior: {
        strictTransportSecurity: {
          accessControlMaxAge: Duration.seconds(63072000),
          includeSubdomains: true,
          override: true,
        },
        contentTypeOptions: {
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: HeadersReferrerPolicy.SAME_ORIGIN,
          override: true,
        },
        frameOptions: {
          frameOption: HeadersFrameOption.DENY,
          override: true,
        },
      },
    });

    const cdnDistribution = new Distribution(this, 'Distribution', {
      comment: 'CDN for Todo App with GraphQL API',
      priceClass: PriceClass.PRICE_CLASS_100,
      certificate: Certificate.fromCertificateArn(
        this,
        'MyCloudFrontCertificate',
        process.env.CLOUDFRONT_CERTIFICATE_ARN!
      ),
      domainNames: DOMAINS.map((d) => [d.primaryName, ...d.aliases]).flat(),
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new S3Origin(staticFilesBucket),
        compress: true,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy,
        // TODO enable caching for static files
        // cachePolicy: new CachePolicy(this, 'CacheByAcceptHeaderPolicy', {
        //   minTtl: Duration.seconds(1),
        //   maxTtl: Duration.seconds(31536000),
        //   defaultTtl: Duration.seconds(86400),
        //   headerBehavior: CacheHeaderBehavior.allowList('Accept'),
        //   queryStringBehavior: CacheQueryStringBehavior.all(),
        //   cookieBehavior: CacheCookieBehavior.none(),
        //   enableAcceptEncodingBrotli: true,
        //   enableAcceptEncodingGzip: true,
        // }),
        cachePolicy: CachePolicy.CACHING_DISABLED,
        functionAssociations: [
          {
            eventType: FunctionEventType.VIEWER_REQUEST,
            function: new Function(this, 'MainDomainNoSlashRewriteWebpFunction', {
              code: FunctionCode.fromFile({
                filePath: transpileTypeScriptAsFile(
                  path.join(
                    __dirname,
                    './cloudfront-functions/src/mainDomainNoSlashRewriteWebpFunction.ts'
                  ),
                  {
                    replace: {
                      'process.env.PRIMARY_DOMAIN': DOMAINS[0].primaryName,
                    },
                  }
                ),
              }),
            }),
          },
        ],
      },
      additionalBehaviors: {
        [apiUrl.pathname]: {
          origin: new RestApiOrigin(restApi),
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
          compress: true,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy,
        },
        [webSocketUrl.pathname]: {
          origin: new HttpOrigin(Fn.select(1, Fn.split('//', webSocketApi.apiEndpoint))),
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: new OriginRequestPolicy(this, 'WebSocketPolicy', {
            comment: 'Policy for handling WebSockets',
            cookieBehavior: OriginRequestCookieBehavior.none(),
            headerBehavior: OriginRequestHeaderBehavior.allowList(
              'Sec-WebSocket-Key',
              'Sec-WebSocket-Version',
              'Sec-WebSocket-Protcol',
              'Sec-WebSocket-Accept',
              'Sec-WebSocket-Extensions'
            ),
            queryStringBehavior: OriginRequestQueryStringBehavior.none(),
          }),
          // responseHeadersPolicy,
        },
      },
      errorResponses: [
        {
          // Return 404.html when path not found in S3 bucket
          httpStatus: 403,
          ttl: Duration.seconds(10),
          responsePagePath: '/404.html',
          responseHttpStatus: 404,
        },
      ],
    });

    DOMAINS.forEach((domain) => {
      const hostedZone = HostedZone.fromHostedZoneAttributes(this, `Zone-${domain.zoneName}`, {
        hostedZoneId: domain.zoneId,
        zoneName: domain.zoneName,
      });
      const primaryRecord = new ARecord(this, `ARecord-${domain.zoneName}`, {
        zone: hostedZone,
        recordName: domain.primaryName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(cdnDistribution)),
      });

      domain.aliases.forEach((alias) => {
        new ARecord(this, `AliasARecord-${domain.zoneName}-${alias}`, {
          zone: hostedZone,
          recordName: alias,
          target: RecordTarget.fromAlias(new Route53RecordTarget(primaryRecord)),
        });
      });
    });

    const commonBucketDeploymentSettings: BucketDeploymentProps = {
      logRetention: RetentionDays.ONE_DAY,
      sources: [Source.asset('./out')],
      destinationBucket: staticFilesBucket,
      cacheControl: [
        CacheControl.setPublic(),
        CacheControl.maxAge(Duration.seconds(31536000)),
        CacheControl.immutable(),
      ],
    };

    new BucketDeployment(this, 'AllExceptWebpDeployment', {
      ...commonBucketDeploymentSettings,
      exclude: ['*.webp'],
      // TODO enable distribution invalidation
      //distribution: cdnDistribution,
      //distributionPaths: ['/*'],
    });

    new BucketDeployment(this, 'OnlyWebpDeployment', {
      ...commonBucketDeploymentSettings,
      exclude: ['*'],
      include: ['*.webp'],
      contentType: 'image/webp',
    });

    new CfnOutput(this, 'DistributionDomainName', {
      value: cdnDistribution.domainName,
    });
    new CfnOutput(this, 'MongoDbAtlasProjectName', {
      value: mongoDbAtlas.mProject.props.name,
    });
    new CfnOutput(this, 'MongoDbAtlasClusterName', {
      value: mongoDbAtlas.mCluster.props.name,
    });
    new CfnOutput(this, 'MongoDbAtlasConnectionString', {
      value: mongoDbAtlas.mCluster.connectionStrings.standardSrv ?? 'undefined',
    });
    new CfnOutput(this, 'WebSocketUrl', {
      value: webSocketStage.url,
    });
  }
}
