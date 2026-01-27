# AgentCore Client

CLI client for AgentCore Runtime with support for both user and machine-to-machine authentication. Connect to deployed environments, select agents, and interact with them via the command line.

## Installation

```bash
npm install
npm run build
```

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your Backend URL and Cognito settings

# 2. Login
npm run dev login

# 3. List available agents
npm run dev agents list

# 4. Run an agent
npm run dev invoke "Hello" --agent <agentId>
```

## Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Backend API (required for agent management)
BACKEND_URL=http://localhost:3000

# Agent Endpoint (for invoking agents)
AGENTCORE_ENDPOINT=http://localhost:8080/invocations

# Cognito Authentication
COGNITO_USER_POOL_ID=us-east-1_YourPoolId
COGNITO_CLIENT_ID=your-client-id
COGNITO_USERNAME=your-username
COGNITO_PASSWORD=your-password
COGNITO_REGION=us-east-1
```

## Authentication Modes

The client supports two authentication modes:

### 1. User Authentication (Default)

Used for interactive user sessions with username/password.

```bash
# .env
AUTH_MODE=user
COGNITO_USER_POOL_ID=us-east-1_YourPoolId
COGNITO_CLIENT_ID=your-client-id
COGNITO_USERNAME=your-username
COGNITO_PASSWORD=your-password
COGNITO_REGION=us-east-1
```

### 2. Machine User Authentication

Used for machine-to-machine (M2M) communication using Client Credentials Flow.

```bash
# .env
AUTH_MODE=machine
COGNITO_DOMAIN=your-domain.auth.ap-northeast-1.amazoncognito.com
MACHINE_CLIENT_ID=your-machine-client-id
MACHINE_CLIENT_SECRET=your-machine-client-secret
TARGET_USER_ID=user-uuid-to-act-as
COGNITO_SCOPE=agentcore/batch.execute  # optional
```

## Usage

### Authentication

```bash
# Interactive login
npm run dev login

# Login with credentials
npm run dev login --username user@example.com --password YourPassword

# Show current user info
npm run dev whoami
```

### Agent Management

```bash
# List all agents
npm run dev agents list

# Show agent details
npm run dev agents show <agentId>

# Initialize default agents (for first-time setup)
npm run dev agents init
```

### Invoking Agents

```bash
# Invoke with specific agent
npm run dev invoke "What is 2+2?" --agent <agentId>

# Interactive agent selection
npm run dev invoke "Hello" --select-agent

# With session ID (for conversation continuity)
npm run dev invoke "Tell me more" --agent <agentId> --session-id <sessionId>
```

### Other Commands

```bash
# Check Agent health
npm run dev ping

# Interactive mode
npm run dev interactive

# Show configuration
npm run dev config

# Show token information
npm run dev token
```

### With Machine User Authentication

Using environment variables:

```bash
# Set environment
export AUTH_MODE=machine
export COGNITO_DOMAIN=your-domain.auth.ap-northeast-1.amazoncognito.com
export MACHINE_CLIENT_ID=your-machine-client-id
export MACHINE_CLIENT_SECRET=your-machine-client-secret
export TARGET_USER_ID=user-uuid
export AGENTCORE_ENDPOINT=http://localhost:8080

# Invoke
npm run dev invoke "Hello, test message"
```

Using CLI options:

```bash
npm run dev invoke "Hello" --machine-user --target-user user-uuid
```

### Show Machine User Token

```bash
# Using environment variable
export AUTH_MODE=machine
npm run dev token

# Or using CLI option
npm run dev token --machine
```

## Command Reference

### Global Options

- `--endpoint <url>` - Override endpoint URL
- `--json` - Output in JSON format
- `--machine-user` - Use machine user authentication
- `--target-user <userId>` - Target user ID (for machine user mode)

### Commands

#### `login`

Authenticate with Cognito.

```bash
npm run dev login [options]

Options:
  --username <username>  Username
  --password <password>  Password
  --json                 JSON output
```

#### `whoami`

Display current user information.

```bash
npm run dev whoami [options]

Options:
  --json    JSON output
```

#### `agents list`

List available agents.

```bash
npm run dev agents list [options]

Options:
  --json    JSON output
```

#### `agents show <agentId>`

Show agent details.

```bash
npm run dev agents show <agentId> [options]

Options:
  --json    JSON output
```

#### `agents init`

Initialize default agents for the user.

```bash
npm run dev agents init [options]

Options:
  --json    JSON output
```

#### `ping`

Check Agent health status.

```bash
npm run dev ping [options]

Options:
  --json    JSON output
```

#### `invoke <prompt>`

Send a prompt to the Agent.

```bash
npm run dev invoke "Your prompt here" [options]

Options:
  --agent <agentId>     Agent ID to use
  --select-agent        Select agent interactively
  --session-id <id>     Session ID for conversation continuity
  --json                JSON output
```

#### `interactive`

Interactive mode for continuous conversation.

```bash
npm run dev interactive
```

#### `config`

Display and validate configuration.

```bash
npm run dev config [options]

Options:
  --validate    Validate configuration
  --json        JSON output
```

#### `token`

Display JWT token information.

```bash
npm run dev token [options]

Options:
  --machine    Show machine user token
```

#### `runtimes`

List available runtimes.

```bash
npm run dev runtimes
```

## Examples

### Example 1: Local Development - Full Workflow

```bash
# .env
BACKEND_URL=http://localhost:3000
AGENTCORE_ENDPOINT=http://localhost:8080/invocations
AUTH_MODE=user
COGNITO_USER_POOL_ID=us-east-1_ABC123
COGNITO_CLIENT_ID=abc123client
COGNITO_USERNAME=testuser
COGNITO_PASSWORD=TestPassword123!

# Login and list agents
npm run dev login
npm run dev agents list

# Run a specific agent
npm run dev invoke "Hello, Agent!" --agent agent-001

# Or select interactively
npm run dev invoke "Hello" --select-agent
```

### Example 2: AWS Deployed Environment

```bash
# .env
BACKEND_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com
AGENTCORE_RUNTIME_ARN=arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/abc123
AUTH_MODE=user
COGNITO_USER_POOL_ID=us-east-1_ABC123
COGNITO_CLIENT_ID=abc123client
COGNITO_USERNAME=user@example.com
COGNITO_PASSWORD=SecurePassword123!

# Run
npm run dev login
npm run dev agents list
npm run dev invoke "Analyze this data" --agent data-analyst-agent
```

### Example 3: Local Development with Machine User

```bash
# .env
AGENTCORE_ENDPOINT=http://localhost:8080
AUTH_MODE=machine
COGNITO_DOMAIN=dev.auth.ap-northeast-1.amazoncognito.com
MACHINE_CLIENT_ID=abc123machine
MACHINE_CLIENT_SECRET=secret123
TARGET_USER_ID=user-uuid-here

# Run
npm run dev invoke "Batch processing request"
```

### Example 3: AWS Runtime with Machine User

```bash
# .env
AGENTCORE_RUNTIME_ARN=arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/abc123
AUTH_MODE=machine
COGNITO_DOMAIN=prod.auth.ap-northeast-1.amazoncognito.com
MACHINE_CLIENT_ID=prod-machine-client
MACHINE_CLIENT_SECRET=prod-secret
TARGET_USER_ID=production-user-uuid
COGNITO_SCOPE=agentcore/batch.execute

# Run
npm run dev invoke "Production batch request"
```

### Example 4: CLI Options Override

```bash
# Override endpoint and use machine user
npm run dev invoke "Test" \
  --endpoint http://localhost:3000 \
  --machine-user \
  --target-user test-user-uuid
```

## Machine User Setup

To set up machine user authentication:

1. **Create App Client in Cognito**:
   - Go to AWS Cognito Console
   - Select your User Pool
   - Create a new App Client
   - Enable "Client credentials" OAuth flow
   - Note the Client ID and Client Secret

2. **Configure Resource Server** (if using custom scopes):
   - Add a Resource Server in Cognito
   - Define custom scopes (e.g., `agentcore/batch.execute`)
   - Associate scopes with the App Client

3. **Set Environment Variables**:
   ```bash
   export AUTH_MODE=machine
   export COGNITO_DOMAIN=your-domain.auth.region.amazoncognito.com
   export MACHINE_CLIENT_ID=your-client-id
   export MACHINE_CLIENT_SECRET=your-client-secret
   export TARGET_USER_ID=user-to-act-as
   ```

4. **Test Authentication**:
   ```bash
   npm run dev token --machine
   npm run dev config --validate
   ```

## Token Caching

Both authentication modes use token caching with a 5-minute expiration buffer:

- **User tokens**: Cached per `userPoolId:username`
- **Machine tokens**: Cached per `cognitoDomain:clientId`

Tokens are automatically refreshed when they approach expiration.

## Error Handling

Common errors and solutions:

### "COGNITO_DOMAIN is not set"
- Set `COGNITO_DOMAIN` environment variable when using `AUTH_MODE=machine`

### "MACHINE_CLIENT_ID is not set"
- Set `MACHINE_CLIENT_ID` environment variable

### "TARGET_USER_ID is not set"
- Set `TARGET_USER_ID` to specify which user the machine user acts as

### "Token request failed: 401"
- Check that `MACHINE_CLIENT_ID` and `MACHINE_CLIENT_SECRET` are correct
- Verify the App Client has "Client credentials" flow enabled

### "Token request failed: 400"
- Check that `COGNITO_DOMAIN` is correct (without `https://`)
- Verify `COGNITO_SCOPE` matches configured scopes in Cognito

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev <command>

# Lint
npm run lint

# Format
npm run lint:fix
```

## Architecture

```
src/
├── index.ts              # CLI entry point
├── config/
│   └── index.ts          # Configuration management
├── auth/
│   ├── cognito.ts        # User authentication (USER_PASSWORD_AUTH)
│   └── machine-user.ts   # Machine authentication (Client Credentials)
├── api/
│   └── client.ts         # API client with streaming support
└── commands/
    ├── ping.ts           # Health check command
    ├── invoke.ts         # Invoke command
    └── config.ts         # Configuration commands
```

## Related Documentation

- [Machine User Testing Guide](../../docs/machine-user-testing.md)
- [Test Script](../../scripts/test-machine-user.ts)
- [Cognito Configuration](../cdk/lib/constructs/cognito-auth.ts)

## License

MIT
