/**
 * Sync Ignore Pattern Matcher
 * .gitignore スタイルのパターンマッチング機能を提供
 */

import micromatch from 'micromatch';
import { logger } from '../config/index.js';

/**
 * デフォルトの除外パターン
 */
const DEFAULT_IGNORE_PATTERNS = [
  // Version control
  '.git/',
  '.svn/',
  '.hg/',
  
  // Dependencies
  'node_modules/',
  'bower_components/',
  'vendor/',
  
  // Build outputs
  'dist/',
  'build/',
  'out/',
  'target/',
  '.next/',
  '.nuxt/',
  
  // Environment and secrets
  '.env',
  '.env.*',
  '!.env.example',
  '.env.local',
  '.env.*.local',
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
  
  // Logs
  '*.log',
  'logs/',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  'lerna-debug.log*',
  
  // Temporary files
  '*.tmp',
  '*.temp',
  '*.swp',
  '*.swo',
  '*~',
  '.DS_Store',
  'Thumbs.db',
  
  // IDE
  '.vscode/',
  '.idea/',
  '*.iml',
  '.project',
  '.classpath',
  '.settings/',
  
  // Cache
  '.cache/',
  '.npm/',
  '.yarn/',
  '.pnp/',
  '.pnp.js',
  
  // OS
  'desktop.ini',
  '$RECYCLE.BIN/',
];

/**
 * Sync Ignore Pattern クラス
 */
export class SyncIgnorePattern {
  private patterns: string[] = [];
  private negatePatterns: string[] = [];

  constructor(customPatterns: string[] = []) {
    this.loadPatterns(customPatterns);
  }

  /**
   * パターンを読み込む
   */
  private loadPatterns(customPatterns: string[]): void {
    // デフォルトパターンとカスタムパターンをマージ
    const allPatterns = [...DEFAULT_IGNORE_PATTERNS, ...customPatterns];

    // 空行とコメント行を除外
    const validPatterns = allPatterns
      .map(p => p.trim())
      .filter(p => p && !p.startsWith('#'));

    // 否定パターン（!で始まる）とそれ以外を分離
    for (const pattern of validPatterns) {
      if (pattern.startsWith('!')) {
        this.negatePatterns.push(pattern.substring(1));
      } else {
        this.patterns.push(pattern);
      }
    }

    logger.info('[SYNC_IGNORE] Loaded patterns:', {
      ignorePatterns: this.patterns.length,
      negatePatterns: this.negatePatterns.length,
    });
  }

  /**
   * ファイルパスが除外対象かどうかを判定
   * @param filePath - 判定するファイルパス（相対パス）
   * @returns true: 除外対象, false: 同期対象
   */
  shouldIgnore(filePath: string): boolean {
    // パスを正規化（Windowsパスも対応）
    const normalizedPath = filePath.replace(/\\/g, '/');

    // 否定パターンにマッチする場合は同期対象
    if (this.negatePatterns.length > 0) {
      const isNegated = micromatch.isMatch(normalizedPath, this.negatePatterns, {
        dot: true,
        matchBase: true,
      });
      if (isNegated) {
        logger.debug('[SYNC_IGNORE] File explicitly included (negate pattern):', normalizedPath);
        return false;
      }
    }

    // 通常パターンにマッチする場合は除外対象
    if (this.patterns.length > 0) {
      const isIgnored = micromatch.isMatch(normalizedPath, this.patterns, {
        dot: true,
        matchBase: true,
      });
      if (isIgnored) {
        logger.debug('[SYNC_IGNORE] File ignored:', normalizedPath);
        return true;
      }
    }

    return false;
  }

  /**
   * 複数のファイルパスをフィルタリング
   * @param filePaths - ファイルパスの配列
   * @returns 同期対象のファイルパスの配列
   */
  filter(filePaths: string[]): string[] {
    return filePaths.filter(path => !this.shouldIgnore(path));
  }

  /**
   * 現在のパターンを取得（デバッグ用）
   */
  getPatterns(): { ignore: string[]; negate: string[] } {
    return {
      ignore: [...this.patterns],
      negate: [...this.negatePatterns],
    };
  }

  /**
   * .syncignore ファイルの内容をパースしてパターンを作成
   * @param content - .syncignore ファイルの内容
   * @returns SyncIgnorePattern インスタンス
   */
  static fromSyncIgnoreContent(content: string): SyncIgnorePattern {
    const lines = content.split(/\r?\n/);
    return new SyncIgnorePattern(lines);
  }
}
