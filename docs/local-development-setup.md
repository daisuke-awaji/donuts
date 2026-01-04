# Local Development Setup Guide

## Overview

This project implements a mechanism to automatically retrieve environment variables from CloudFormation stack outputs and generate `.env` files. This allows developers to start local development immediately after deployment without manually setting up environment variables.

## 🎯 Development Patterns

### Pattern A: Local Development Mode (Default)

```
┌──────────────────────────────────────────────────────────────┐
│ Local                                                         │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐                │
│  │Frontend │ ──▶ │Backend  │ ──▶ │Agent    │                │
│  │:5173    │     │:3000    │     │:8080    │                │
│  └─────────┘     └─────────┘     └─────────┘                │
│                       │               │                      │
└───────────────────────┼───────────────┼──────────────────────┘
                        │               │
                        ▼               ▼
              ┌─────────────────────────────────┐
              │ Cloud (AWS)                     │
              │  - Cognito (Authentication)     │
              │  - AgentCore Gateway/Memory     │
              │  - S3 (User Storage)            │
              └─────────────────────────────────┘
```

**Features:**
- Frontend connects to `localhost:3000` (Backend) and `localhost:8080` (Agent)
- Backend/Agent connect to AWS resources (Cognito, Memory, Gateway, S3)
- Hot reload enabled for fast development cycle
- Easy debugging and no Lambda invocation costs

## 🚀 Quick Start

### 1. Deploy CDK Stack

```bash
npm run deploy
```

### 2. Auto-setup Environment Variables

```bash
npm run setup-env
```

This command:
- Retrieves CloudFormation stack outputs
- Auto-generates `.env` files for each package
  - `packages/frontend/.env`
  - `packages/backend/.env`
  - `packages/agent/.env`

### 3. Start All Services

```bash
npm run dev
```

Or start individually:

```bash
npm run dev:frontend   # Frontend only
npm run dev:backend    # Backend only
npm run dev:agent      # Agent only
```

## 📝 setup-env Details

### Execution

```bash
# Default (AgentCoreStack)
npm run setup-env

# Specify custom stack name
STACK_NAME=MyCustomStack npm run setup-env
```

### Generated Environment Variables

#### Frontend (packages/frontend/.env)

```bash
# Cognito Configuration
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=us-east-1

# Backend API Configuration (Local Development Mode)
VITE_BACKEND_URL=http://localhost:3000

# Agent API Configuration (Local Development Mode)
VITE_AGENT_ENDPOINT=http://localhost:8080/invocations
```

#### Backend (packages/backend/.env)

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ALLOWED_ORIGINS=*

# JWT / JWKS Configuration
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_REGION=us-east-1

# AgentCore Memory Configuration
AGENTCORE_MEMORY_ID=memory-id
AGENTCORE_GATEWAY_ENDPOINT=https://xxx.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp

# User Storage Configuration
USER_STORAGE_BUCKET_NAME=bucket-name
```

#### Agent (packages/agent/.env)

```bash
# AWS Region
AWS_REGION=us-east-1

# AgentCore Memory
AGENTCORE_MEMORY_ID=memory-id

# AgentCore Gateway
AGENTCORE_GATEWAY_ENDPOINT=https://xxx.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp

# User Storage
USER_STORAGE_BUCKET_NAME=bucket-name

# Server Configuration
PORT=8080
NODE_ENV=development
```

### How the Script Works

`scripts/setup-env.ts` performs the following:

1. **Determine Stack Name**
   - Uses environment variable `STACK_NAME` or default value `AgentCoreStack`

2. **Retrieve CloudFormation Outputs**
   - Calls `DescribeStacks` API using AWS SDK
   - Extracts required Output values

3. **Generate `.env` Files**
   - Creates environment variables for each package
   - Writes to files

4. **Error Handling**
   - Error message when stack is not found
   - Detects AWS authentication errors and shows resolution steps
   - Warns when required Outputs are missing

## 🔧 Troubleshooting

### Error: Stack Not Found

```bash
❌ Failed to retrieve stack outputs: Stack with id AgentCoreStack does not exist
```

**Resolution:**
1. Verify stack name is correct
2. Confirm stack is deployed
3. Check AWS credentials are configured

```bash
# Check stack list
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Specify correct stack name
STACK_NAME=YourActualStackName npm run setup-env
```

### Error: Missing AWS Credentials

```bash
❌ Failed to retrieve stack outputs: Missing credentials in config
```

**Resolution:**

```bash
# Configure AWS CLI
aws configure

# Or specify with environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

### Warning: Some Outputs Not Found

```bash
⚠️  Warning: The following outputs were not found:
  - UserPoolId
  - UserPoolClientId
```

**Cause:**
CDK stack is not outputting these values

**Resolution:**
1. Update CDK stack to latest version
2. Redeploy: `npm run deploy`
3. Re-run `setup-env`

## 📋 CDK Output List

The following CloudFormation Outputs are used by `setup-env`:

| Output Key | Purpose | Required |
|-----------|---------|----------|
| `Region` | AWS Region | ✅ |
| `UserPoolId` | Cognito User Pool ID | ✅ |
| `UserPoolClientId` | Cognito Client ID | ✅ |
| `MemoryId` | AgentCore Memory ID | ✅ |
| `GatewayMcpEndpoint` | AgentCore Gateway Endpoint | ✅ |
| `UserStorageBucketName` | S3 Bucket Name | ✅ |
| `BackendApiUrl` | Backend API URL | ❌ |
| `RuntimeInvocationEndpoint` | Runtime Endpoint | ❌ |

## 🎨 Customization

### Switching to Cloud Connection Mode

Edit generated `.env` files to connect directly to cloud resources:

```bash
# Edit packages/frontend/.env
# Uncomment the commented lines
VITE_BACKEND_URL=https://xxx.execute-api.us-east-1.amazonaws.com
VITE_AGENT_ENDPOINT=https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/.../invocations
```

### Adding Environment Variables

Edit `scripts/setup-env.ts` to add new environment variables:

```typescript
interface StackOutputs {
  Region?: string;
  UserPoolId?: string;
  // ... existing definitions
  YourNewOutput?: string;  // Add new Output
}

function createFrontendEnv(outputs: StackOutputs): string {
  return `
# Existing environment variables
...

# New environment variable
VITE_YOUR_NEW_VAR=${outputs.YourNewOutput || ''}
`;
}
```

## 🔗 Related Documentation

- [README.md](../README.md) - Project Overview
- [jwt-authentication.md](./jwt-authentication.md) - JWT Authentication System
- [packages/agent/README.md](../packages/agent/README.md) - Agent Implementation Details
- [packages/backend/README.md](../packages/backend/README.md) - Backend API Details
- [packages/frontend/README.md](../packages/frontend/README.md) - Frontend Implementation Details

## 💡 Best Practices

1. **Always Run `setup-env` After Deployment**
   ```bash
   npm run deploy && npm run setup-env
   ```

2. **Do Not Commit `.env` Files**
   - Already included in `.gitignore`
   - Contains sensitive information, do not commit to Git

3. **Regularly Update Environment Variables**
   - Re-run `setup-env` after stack updates
   ```bash
   npm run deploy && npm run setup-env && npm run dev
   ```

4. **Standardize Stack Names**
   - Use the same stack name across the team
   - Or define `STACK_NAME` in `.env`

5. **Check Error Logs**
   - Review error messages if `setup-env` fails
   - Check stack status with AWS CLI if needed
