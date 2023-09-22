import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const GRAPHQL_URI = process.env.NEXT_PUBLIC_GRAPHQL_URI!;
const GRAPHQL_WS_URI = process.env.NEXT_PUBLIC_GRAPHQL_WS_URI!;

const httpLink = new HttpLink({
  uri: GRAPHQL_URI,
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS_URI,
  })
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  httpLink
);

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: splitLink,
});

export default client;
