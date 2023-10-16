import { defineConfig } from 'cypress';
import { configurePlugin } from 'cypress-mongodb';

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
