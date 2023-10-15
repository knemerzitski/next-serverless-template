#!/usr/bin/env node

import 'source-map-support/register';
import path from 'path';

import { App } from 'aws-cdk-lib';
import dotenv from 'dotenv';

import { InfraStack } from '../infraStack';

const envPaths = ['./../../.env.production.local', './../../.env.local'];
envPaths.forEach((relPath) => {
  const envPath = path.join(__dirname, relPath);
  const out = dotenv.config({ path: envPath });
  if (out.parsed) {
    console.log(`Loaded environment variables from "${envPath.toString()}"`);
  }
});

const app = new App();
new InfraStack(app, 'TodoAppStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
