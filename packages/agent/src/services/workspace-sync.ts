/**
 * Workspace Sync Service
 * Thin adapter over @fullstack-agentcore/s3-workspace-sync that maps
 * the agent-specific (userId, storagePath) convention to the generic package API.
 */

import { S3WorkspaceSync } from '@fullstack-agentcore/s3-workspace-sync';
import type { SyncResult } from '@fullstack-agentcore/s3-workspace-sync';
import { logger, WORKSPACE_DIRECTORY } from '../config/index.js';

export type { SyncResult };

/**
 * Agent-specific workspace sync wrapper.
 *
 * Maps `(userId, storagePath)` to an S3 prefix of the form
 * `users/{userId}/{storagePath}/` and delegates all sync operations
 * to {@link S3WorkspaceSync}.
 */
export class WorkspaceSync {
  private readonly inner: S3WorkspaceSync;

  constructor(userId: string, storagePath: string) {
    const bucketName = process.env.USER_STORAGE_BUCKET_NAME || '';
    const normalizedPath = storagePath.replace(/^\/+|\/+$/g, '');
    const prefix = normalizedPath ? `users/${userId}/${normalizedPath}/` : `users/${userId}/`;

    this.inner = new S3WorkspaceSync({
      bucket: bucketName,
      prefix,
      workspaceDir: WORKSPACE_DIRECTORY,
      region: process.env.AWS_REGION,
      logger,
    });
  }

  /**
   * Start initial sync in the background (non-blocking).
   */
  startInitialSync(): void {
    this.inner.startBackgroundPull();
  }

  /**
   * Wait for the initial sync to complete.
   */
  async waitForInitialSync(): Promise<void> {
    await this.inner.waitForPull();
  }

  /**
   * Upload local changes to S3 (diff-based).
   */
  async syncToS3(): Promise<SyncResult> {
    return this.inner.push();
  }

  /**
   * Get the workspace directory path.
   */
  getWorkspacePath(): string {
    return this.inner.getWorkspacePath();
  }
}
