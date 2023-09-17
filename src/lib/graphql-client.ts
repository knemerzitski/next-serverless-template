import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

const GRAPHQL_URI = process.env.NEXT_PUBLIC_GRAPHQL_URI!;

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: new HttpLink({
    uri: GRAPHQL_URI,
  }),
});

export default client;
