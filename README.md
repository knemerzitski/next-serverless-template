# Template Next.js App

A template todo list app that runs on serverless architecture using AWS and MongoDB for data storage. It uses GraphQL for API and supports subscriptions using AWS Gateway WebSocket API. Events are handled by Lambdas.

Tech stack

- Next.js (static site generation with export)
- GraphQL
  - `@apollo/server` - queries and mutations
  - `graphql` - subscriptions
- DynamoDB (only WebSocket connections and subscriptions)
- MongoDB, Mongoose (for actual data)

# Getting Started

## Prerequesites

- Docker must be installed. It's used to mock DynamoDB, MongoDB and bundle Lambda handers by CDK.
- NPM package `aws-cdk` is required during deployment with proper session active.

## Development

1. Define required environment variables. You can copy `.env.test` to `.env.local`
2. `npm run mock:db` to start MongoDB and DynamoDB Docker containers detached
3. `npm run mock:lambda:dev` to run backend GraphQL API (express server that emulates events for lambda handlers)
4. `npm run dev` to run frontend Next.js

## Testing

`npm run test:prepare` to start DynamoDB and MongoDB containers

- `npm run test:jest` Jest tests
- `npm run test:component` Cypress component tests
- `npm run test:e2e` Cypress E2E tests

`npm run:test:cleanup` to stop DynamoDB and MongoDB containers

## Deployment

1. Define required environment variables. Check [.env.production.local.example](.env.production.local.example) for details.
2. Run `npm run build` to generate static site with Next.js output `export`
3. Run `npm run deploy` to run AWS CDK and deploy CloudFormation template
