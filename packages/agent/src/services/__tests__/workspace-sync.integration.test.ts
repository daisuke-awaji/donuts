/**
 * WorkspaceSync Integration Tests
 * 実際のS3に接続してファイル同期をテスト
 *
 * 実行方法:
 * cd packages/agent
 * npx jest --testMatch="glob-pattern-for-integration-tests"
 */

import { WorkspaceSync } from '../workspace-sync.js';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 環境変数チェック
const BUCKET_NAME = process.env.USER_STORAGE_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION || 'us-west-2';
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_STORAGE_PATH = 'integration-test';

if (!BUCKET_NAME) {
  throw new Error(
    'USER_STORAGE_BUCKET_NAME environment variable is required for integration tests'
  );
}

describe('WorkspaceSync Integration Tests', () => {
  let workspaceSync: WorkspaceSync;
  let s3Client: S3Client;
  let testWorkspaceDir: string;
  let s3Prefix: string;

  beforeAll(() => {
    s3Client = new S3Client({ region: AWS_REGION });
    s3Prefix = `users/${TEST_USER_ID}/${TEST_STORAGE_PATH}/`;

    console.log('🧪 Integration Test Setup:');
    console.log(`  Bucket: ${BUCKET_NAME}`);
    console.log(`  Region: ${AWS_REGION}`);
    console.log(`  S3 Prefix: ${s3Prefix}`);
  });

  beforeEach(() => {
    // テスト用の一時ワークスペースディレクトリを作成
    testWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-sync-test-'));

    // WorkspaceSyncインスタンスを作成
    workspaceSync = new WorkspaceSync(TEST_USER_ID, TEST_STORAGE_PATH);

    // ワークスペースディレクトリを上書き（テスト用）
    (workspaceSync as any).workspaceDir = testWorkspaceDir;

    console.log(`📁 Test workspace: ${testWorkspaceDir}`);
  });

  afterEach(async () => {
    // ローカルのテストディレクトリをクリーンアップ
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }

    // S3のテストファイルをクリーンアップ
    await cleanupS3TestFiles();
  });

  /**
   * S3のテストファイルを削除
   */
  async function cleanupS3TestFiles(): Promise<void> {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: s3Prefix,
      });

      const response = await s3Client.send(listCommand);

      if (response.Contents && response.Contents.length > 0) {
        for (const item of response.Contents) {
          if (item.Key) {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: item.Key,
            });
            await s3Client.send(deleteCommand);
          }
        }
        console.log(`🧹 Cleaned up ${response.Contents.length} test files from S3`);
      }
    } catch (error) {
      console.error('⚠️ Failed to cleanup S3 test files:', error);
    }
  }

  /**
   * S3にテストファイルをアップロード
   */
  async function uploadTestFileToS3(fileName: string, content: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `${s3Prefix}${fileName}`,
      Body: content,
      ContentType: 'text/plain',
    });
    await s3Client.send(command);
  }

  /**
   * S3にファイルが存在するかチェック
   */
  async function fileExistsInS3(fileName: string): Promise<boolean> {
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${s3Prefix}${fileName}`,
      MaxKeys: 1,
    });
    const response = await s3Client.send(listCommand);
    return (response.Contents?.length ?? 0) > 0;
  }

  describe('初期同期 (S3 → ローカル)', () => {
    test('S3からファイルをダウンロードできる', async () => {
      // S3にテストファイルを配置
      const testFileName = 'test-download.txt';
      const testContent = 'Hello from S3!';
      await uploadTestFileToS3(testFileName, testContent);

      // 初期同期を実行
      workspaceSync.startInitialSync();
      await workspaceSync.waitForInitialSync();

      // ローカルにファイルがダウンロードされたことを確認
      const localFilePath = path.join(testWorkspaceDir, testFileName);
      expect(fs.existsSync(localFilePath)).toBe(true);

      const downloadedContent = fs.readFileSync(localFilePath, 'utf-8');
      expect(downloadedContent).toBe(testContent);

      console.log('✅ File downloaded successfully from S3');
    }, 30000);

    test('複数ファイルを一度にダウンロードできる', async () => {
      // 複数のテストファイルを配置
      const files = [
        { name: 'file1.txt', content: 'Content 1' },
        { name: 'file2.txt', content: 'Content 2' },
        { name: 'subdir/file3.txt', content: 'Content 3' },
      ];

      for (const file of files) {
        await uploadTestFileToS3(file.name, file.content);
      }

      // 初期同期を実行
      workspaceSync.startInitialSync();
      await workspaceSync.waitForInitialSync();

      // 全てのファイルがダウンロードされたことを確認
      for (const file of files) {
        const localFilePath = path.join(testWorkspaceDir, file.name);
        expect(fs.existsSync(localFilePath)).toBe(true);

        const content = fs.readFileSync(localFilePath, 'utf-8');
        expect(content).toBe(file.content);
      }

      console.log('✅ Multiple files downloaded successfully');
    }, 30000);

    test('空のS3でもエラーなく同期完了する', async () => {
      // S3にファイルがない状態で初期同期
      workspaceSync.startInitialSync();
      await workspaceSync.waitForInitialSync();

      // エラーなく完了することを確認
      const files = fs.readdirSync(testWorkspaceDir);
      expect(files.length).toBe(0);

      console.log('✅ Empty S3 sync completed without error');
    }, 30000);
  });

  describe('変更同期 (ローカル → S3)', () => {
    test('新規ファイルをS3にアップロードできる', async () => {
      // 初期同期を完了
      workspaceSync.startInitialSync();
      await workspaceSync.waitForInitialSync();

      // ローカルに新規ファイルを作成
      const testFileName = 'test-upload.txt';
      const testContent = 'Hello from local!';
      const localFilePath = path.join(testWorkspaceDir, testFileName);
      fs.writeFileSync(localFilePath, testContent);

      // S3へ同期
      const result = await workspaceSync.syncToS3();

      // 同期が成功したことを確認
      expect(result.success).toBe(true);
      expect(result.uploadedFiles).toBe(1);

      // S3にファイルが存在することを確認
      const existsInS3 = await fileExistsInS3(testFileName);
      expect(existsInS3).toBe(true);

      console.log('✅ File uploaded successfully to S3');
    }, 30000);

    test('変更されたファイルのみアップロードする', async () => {
      // S3に2つのファイルを配置
      await uploadTestFileToS3('unchanged.txt', 'Original content');
      await uploadTestFileToS3('to-change.txt', 'Original content');

      // 初期同期を実行
      workspaceSync.startInitialSync();
      await workspaceSync.waitForInitialSync();

      // 1つのファイルだけを変更
      const changedFilePath = path.join(testWorkspaceDir, 'to-change.txt');
      fs.writeFileSync(changedFilePath, 'Modified content');

      // S3へ同期
      const result = await workspaceSync.syncToS3();

      // 変更されたファイルのみがアップロードされたことを確認
      expect(result.success).toBe(true);
      expect(result.uploadedFiles).toBe(1);

      console.log('✅ Only changed file was uploaded');
    }, 30000);

    test('複数のファイルを一度にアップロードできる', async () => {
      // 初期同期を完了
      workspaceSync.startInitialSync();
      await workspaceSync.waitForInitialSync();

      // 複数のファイルを作成
      const files = [
        { name: 'upload1.txt', content: 'Upload 1' },
        { name: 'upload2.txt', content: 'Upload 2' },
        { name: 'subdir/upload3.txt', content: 'Upload 3' },
      ];

      for (const file of files) {
        const filePath = path.join(testWorkspaceDir, file.name);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, file.content);
      }

      // S3へ同期
      const result = await workspaceSync.syncToS3();

      // 全てのファイルがアップロードされたことを確認
      expect(result.success).toBe(true);
      expect(result.uploadedFiles).toBe(3);

      // S3に全てのファイルが存在することを確認
      for (const file of files) {
        const exists = await fileExistsInS3(file.name);
        expect(exists).toBe(true);
      }

      console.log('✅ Multiple files uploaded successfully');
    }, 30000);
  });

  describe('双方向同期', () => {
    test('S3からダウンロード後、変更してアップロードできる', async () => {
      // S3にファイルを配置
      const fileName = 'roundtrip.txt';
      await uploadTestFileToS3(fileName, 'Original from S3');

      // 初期同期でダウンロード
      workspaceSync.startInitialSync();
      await workspaceSync.waitForInitialSync();

      // ファイルを変更
      const filePath = path.join(testWorkspaceDir, fileName);
      const originalContent = fs.readFileSync(filePath, 'utf-8');
      expect(originalContent).toBe('Original from S3');

      fs.writeFileSync(filePath, 'Modified locally');

      // S3へアップロード
      const result = await workspaceSync.syncToS3();
      expect(result.success).toBe(true);
      expect(result.uploadedFiles).toBe(1);

      console.log('✅ Round-trip sync completed successfully');
    }, 30000);
  });

  describe('エラーハンドリング', () => {
    test('バケット名が未設定の場合はスキップする', () => {
      // 環境変数を一時的に削除
      const originalBucket = process.env.USER_STORAGE_BUCKET_NAME;
      delete process.env.USER_STORAGE_BUCKET_NAME;

      const sync = new WorkspaceSync(TEST_USER_ID, TEST_STORAGE_PATH);
      sync.startInitialSync();

      // エラーにならずに完了することを確認
      expect(() => sync.waitForInitialSync()).not.toThrow();

      // 環境変数を復元
      process.env.USER_STORAGE_BUCKET_NAME = originalBucket;

      console.log('✅ Handled missing bucket name gracefully');
    });
  });
});
