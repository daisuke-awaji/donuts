#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AgentCoreStack } from '../lib/agentcore-stack';
import { getEnvironmentConfig, Environment } from '../config';

const app = new cdk.App();

// 環境を Context から取得（デフォルト: default）
const envContext = app.node.tryGetContext('env') as Environment | undefined;
const envName: Environment = envContext || 'default';

// 環境設定を取得
const envConfig = getEnvironmentConfig(envName);

// スタック名: AgentCoreApp (デフォルト), AgentCoreAppDev, AgentCoreAppStg, AgentCoreAppPrd
const stackName = envContext
  ? `AgentCoreApp${envName.charAt(0).toUpperCase() + envName.slice(1)}`
  : 'AgentCoreApp';

// スタックを作成
new AgentCoreStack(app, stackName, {
  env: {
    account: envConfig.awsAccount || process.env.CDK_DEFAULT_ACCOUNT,
    region: envConfig.awsRegion,
  },
  envConfig: envConfig,
  tavilyApiKeySecretName: envConfig.tavilyApiKeySecretName,
  description: `Amazon Bedrock AgentCore - ${envName.toUpperCase()} environment`,
  terminationProtection: envConfig.deletionProtection,
});

// 環境情報を出力
console.log(`🚀 Deploying AgentCore Stack for environment: ${envName}`);
console.log(`📦 Stack Name: ${stackName}`);
console.log(`🌍 Region: ${envConfig.awsRegion}`);
console.log(`🔒 Deletion Protection: ${envConfig.deletionProtection ? 'ENABLED' : 'DISABLED'}`);
