import { readFileSync } from 'fs';
import path from 'path';

import { defineConfig } from 'cypress';
import { configurePlugin } from 'cypress-mongodb';
import dotenv from 'dotenv';

// Load environment variables into Cypress.env
const relEnvPath = `./${process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local'}`;
const envPath = path.join(__dirname, relEnvPath);

const e2eEnv = dotenv.parse(readFileSync(envPath));

export default defineConfig({
  env: {
    mongodb: {
      uri: 'mongodb://root:example@127.0.0.1:27017?authSource=admin',
      database: 'mongo',
      collecton: 'items',
    },
  },
  e2e: {
    baseUrl: 'http://127.0.0.1:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    env: e2eEnv,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setupNodeEvents(on, config) {
      configurePlugin(on);
    },
  },
  component: {
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
});
