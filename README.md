# Template Next.js App

This is a template serverless TODO App using AWS Lambdas.

Tech stack

- Next.js (only frontend)
- GraphQL
  - `@apollo/server` - queries and mutations
  - `graphql` - subscriptions
- DynamoDB (for WebSocket connections and subscriptions)
- MongoDB, Mongoose (for user data)

## Enviroment variables

Variables defined in `.env.local` will be autoloaded.  
Following environment variables are required (with example values):

```
MONGODB_URI=mongodb://root:example@localhost:27017/mongo?authSource=admin
DYNAMODB_ENDPOINT=http://localhost:8000

NEXT_PUBLIC_GRAPHQL_HTTP_URL=http://localhost:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://localhost:4000/graphql
```
