/**
 * Backend API Client
 * HTTP client for Backend Service (VITE_BACKEND_URL)
 */

import { createAuthHeaders, handleApiError, normalizeBaseUrl } from './base-client';

/**
 * Get Backend Service base URL
 */
const getBaseUrl = (): string => {
  return normalizeBaseUrl(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');
};

/**
 * Generic backend API request
 * @param endpoint - API endpoint (e.g., '/agents')
 * @param options - Fetch options
 * @returns Response data
 */
export async function backendRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const headers = await createAuthHeaders();

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * GET request helper
 * @param endpoint - API endpoint
 * @returns Response data
 */
export async function backendGet<T>(endpoint: string): Promise<T> {
  return backendRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 * @param endpoint - API endpoint
 * @param body - Request body
 * @returns Response data
 */
export async function backendPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return backendRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request helper
 * @param endpoint - API endpoint
 * @param body - Request body
 * @returns Response data
 */
export async function backendPut<T>(endpoint: string, body?: unknown): Promise<T> {
  return backendRequest<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 * @param endpoint - API endpoint
 * @returns Response data
 */
export async function backendDelete<T>(endpoint: string): Promise<T> {
  return backendRequest<T>(endpoint, { method: 'DELETE' });
}
