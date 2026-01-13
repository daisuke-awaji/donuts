/**
 * Request Context Middleware
 * Express middleware that sets request context
 */

import { Request, Response, NextFunction } from 'express';
import { createRequestContext, runWithContext } from '../context/request-context.js';
import { logger } from '../config/index.js';

/**
 * JWT token parsing result
 */
interface TokenInfo {
  /** Whether this is a machine user (Client Credentials Flow) */
  isMachineUser: boolean;
  /** User ID (for regular users) */
  userId?: string;
  /** Client ID (for machine users) */
  clientId?: string;
  /** OAuth scopes */
  scopes?: string[];
}

/**
 * Parse JWT token and extract user information
 * Distinguishes between regular users (Authorization Code Flow) and machine users (Client Credentials Flow)
 */
function parseJWTToken(authHeader?: string): TokenInfo {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isMachineUser: false };
  }

  try {
    const token = authHeader.substring(7); // Remove 'Bearer '
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    // Client Credentials Flow detection:
    // - cognito:username does not exist
    // - token_use is "access"
    // - client_id exists
    const hasUsername = !!(payload['cognito:username'] || payload.username);
    const isAccessToken = payload['token_use'] === 'access';
    const hasClientId = !!payload['client_id'];

    const isMachineUser = !hasUsername && isAccessToken && hasClientId;

    if (isMachineUser) {
      return {
        isMachineUser: true,
        clientId: payload['client_id'],
        scopes: payload['scope']?.split(' '),
      };
    }

    // Regular user: extract userId
    const userId =
      payload['cognito:username'] ||
      payload.username ||
      payload.sub ||
      payload.userId ||
      payload.user_id;

    return {
      isMachineUser: false,
      userId,
      scopes: payload['scope']?.split(' '),
    };
  } catch (error) {
    logger.warn('JWT parsing failed:', { error });
    return { isMachineUser: false };
  }
}

/**
 * Middleware to set request context
 * Extract Authorization header and set context with AsyncLocalStorage
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Get Authorization header from multiple sources
  const authHeader =
    req.headers.authorization ||
    (req.headers['x-amzn-bedrock-agentcore-runtime-custom-authorization'] as string);

  // Parse JWT token
  const tokenInfo = parseJWTToken(authHeader);

  // Create request context
  const requestContext = createRequestContext(authHeader);

  // Set token info to context
  requestContext.isMachineUser = tokenInfo.isMachineUser;
  if (tokenInfo.isMachineUser) {
    requestContext.clientId = tokenInfo.clientId;
  } else if (tokenInfo.userId) {
    requestContext.userId = tokenInfo.userId;
  }
  requestContext.scopes = tokenInfo.scopes;

  // Log request context
  logger.info('📝 Request context middleware activated:', {
    requestId: requestContext.requestId,
    userId: requestContext.userId,
    isMachineUser: requestContext.isMachineUser,
    clientId: requestContext.clientId,
    hasAuth: !!authHeader,
    authType: authHeader?.split(' ')[0] || 'None',
    path: req.path,
    method: req.method,
  });

  // Set context with AsyncLocalStorage and execute next()
  runWithContext(requestContext, () => {
    next();
  });
}
