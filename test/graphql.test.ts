import { makeExecutableSchema } from '@graphql-tools/schema';
import { DocumentNode, GraphQLError, GraphQLSchema, execute, parse, validate } from 'graphql';
import { assertValidExecutionArguments, buildExecutionContext } from 'graphql/execution/execute';
import gql from 'graphql-tag';

import { getResolverArgs } from '../src/api/graphql/getResolverArgs';
import { SubscribeEvent } from '../src/api/pubsub/subscribe';
import { isArray } from '../src/utils/isArray';

const resolvers = {
  Subscription: {
    newMessage: {
      subscribe(): SubscribeEvent {
        return {
          topic: 'NEW_MESSAGE',
        };
      },
      resolve: (payload: unknown) => payload,
    },
    otherMessage: {
      subscribe(): SubscribeEvent {
        return {
          topic: 'OTHER_MESSAGE',
        };
      },
      resolve: (payload: unknown) => payload,
    },
  },
};

const typeDefs = gql`
  type Message {
    content: String!
    extra: String
  }
  type Subscription {
    "New messages published"
    newMessage(echo: String!): Message!
    otherMessage: Message!
  }

  type Query {
    _unused: String
  }
`;

const schema = makeExecutableSchema({ typeDefs, resolvers });

const subscriptionsDb = [
  {
    subscription: {
      id: 'randomid',
      type: 'subscribe',
      payload: {
        operationName: 'OnMessageAdded',
        query: 'subscription OnMessageAdded($echo: String!) {newMessage(echo: $echo) {content}}',
        variables: {
          echo: 'echo value',
        },
        // variableValues
      },
    },
    publishedEvent: {
      topic: 'NEW_MESSAGE',
      payload: {
        content: 'hey this is a new message from event',
        extra: 'more info',
      },
    },
    expectedGraphQLExecuteOutput: {
      data: {
        newMessage: {
          content: 'hey this is a new message from event',
        },
      },
    },
  },
];

describe('GraphQL', () => {
  it('executes subscriptions ', async () => {
    const promises = subscriptionsDb.map(
      async ({ subscription, publishedEvent, expectedGraphQLExecuteOutput }) => {
        // Get topic from resolver
        const document = parse(subscription.payload.query);
        const errors = validateQuery({
          schema: schema,
          document,
          variables: subscription.payload.variables,
        });
        if (errors) {
          console.log(errors);
          throw new AggregateError(errors);
        }

        const execContext = buildExecutionContext({
          schema: schema,
          document,
          variableValues: subscription.payload.variables,
          operationName: subscription.payload.operationName,
        });

        // Array => errors, possibly syntax error with received query
        if (isArray(execContext)) {
          console.log(execContext);
          return;
        }

        const operation = execContext.operation.operation;
        if (operation !== 'subscription') {
          throw new Error(`Invalid operation '${operation}'. Only subscriptions are supported.`);
        }

        const {
          field,
          parent,
          args,
          contextValue: resolverContextValue,
          info,
        } = getResolverArgs(execContext);
        if (!field?.subscribe) {
          throw new Error('No field subscribe in schema');
        }

        const { topic } = field.subscribe(
          parent,
          args,
          resolverContextValue,
          info
        ) as SubscribeEvent;
        if (!topic) {
          throw new Error(`Topic from subscribe field resolver is undefined "${topic}"`);
        }

        expect(topic).toBe(publishedEvent.topic);

        // Filters publishedEvent.payload based on subscription query
        const filteredPayload = await execute({
          schema: schema,
          document,
          rootValue: publishedEvent.payload,
          variableValues: subscription.payload.variables,
          operationName: subscription.payload.operationName,
        });

        expect(filteredPayload).toEqual(expectedGraphQLExecuteOutput);
      }
    );

    await Promise.all(promises);
  });
});

function validateQuery({
  schema,
  document,
  variables,
}: {
  schema: GraphQLSchema;
  document: DocumentNode;
  variables?: Record<string, unknown> | null;
}): readonly GraphQLError[] | undefined {
  const errors = validate(schema, document);

  if (errors && errors.length > 0) {
    return errors;
  }

  try {
    assertValidExecutionArguments(schema, document, variables);
  } catch (e) {
    return [e as GraphQLError];
  }
}
