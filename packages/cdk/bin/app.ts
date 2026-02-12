#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AgentCoreStack } from '../lib/agentcore-stack';
import { AgentCoreGatewayTargetStack } from '../lib/agentcore-gateway-target-stack';
import { getEnvironmentConfig, Environment } from '../config';

const app = new cdk.App();

// Get environment from Context (default: default)
const envContext = app.node.tryGetContext('env') as Environment | undefined;
const envName: Environment = envContext || 'default';

// Get environment configuration
const envConfig = getEnvironmentConfig(envName);

// Stack name: DonutsAgentCoreApp (default), DonutsAgentCoreAppDev, DonutsAgentCoreAppStg, DonutsAgentCoreAppPrd, DonutsAgentCoreAppPr123
let stackName: string;
if (!envContext) {
  stackName = 'DonutsAgentCoreApp';
} else if (envName.startsWith('pr-')) {
  // PR environment: DonutsAgentCoreAppPr123
  const prNumber = envName.replace('pr-', '');
  stackName = `DonutsAgentCoreAppPr${prNumber}`;
} else {
  // Standard environment: capitalize first letter
  stackName = `DonutsAgentCoreApp${envName.charAt(0).toUpperCase() + envName.slice(1)}`;
}

// Core Stack: manages foundational resources (Gateway, Cognito, Memory, Storage, Runtime, Frontend).
// Gateway targets are separated into AgentCoreGatewayTargetStack to split the deployment unit,
// allowing each target to be deployed independently without affecting core infrastructure.
const coreStack = new AgentCoreStack(app, stackName, {
  env: {
    account: envConfig.awsAccount || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  envConfig: envConfig,
  tavilyApiKeySecretName: envConfig.tavilyApiKeySecretName,
  description: `Amazon Bedrock AgentCore - ${envName.toUpperCase()} environment`,
  terminationProtection: envConfig.deletionProtection,
});

// Gateway Target Stack: manages Gateway targets (Lambda Tools) as a separate deployment unit.
// By splitting targets into their own stack, additions, changes, and removals of targets
// can be deployed independently without impacting core resources.
// Uses Fn::ImportValue (via coreStackName) for cross-stack Gateway reference,
// or accepts direct Gateway attributes (gatewayArn, etc.) for connecting to externally managed Gateways.
const targetStackName = `${stackName}Targets`;
const targetStack = new AgentCoreGatewayTargetStack(app, targetStackName, {
  env: {
    account: envConfig.awsAccount || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  envConfig: envConfig,
  coreStackName: stackName,
  description: `Amazon Bedrock AgentCore Gateway Targets - ${envName.toUpperCase()} environment`,
  terminationProtection: envConfig.deletionProtection,
});
targetStack.addDependency(coreStack);

// Output environment information
console.log(`🚀 Deploying AgentCore Stack for environment: ${envName}`);
console.log(`📦 Core Stack Name: ${stackName}`);
console.log(`📦 Target Stack Name: ${targetStackName}`);
console.log(`🌍 Region: ${process.env.CDK_DEFAULT_REGION || 'not set (will use AWS_REGION)'}`);
console.log(`🔒 Deletion Protection: ${envConfig.deletionProtection ? 'ENABLED' : 'DISABLED'}`);
