/**
 * Login Command
 * ユーザー認証コマンド
 */

import chalk from 'chalk';
import ora from 'ora';
import readline from 'readline';
import type { ClientConfig } from '../config/index.js';
import { createBackendClient } from '../api/backend-client.js';

/**
 * インタラクティブにユーザー入力を取得
 */
async function prompt(question: string, hidden: boolean = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden) {
      // パスワード入力時は文字を隠す
      process.stdout.write(question);
      let password = '';

      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');

      const onData = (char: string) => {
        const charCode = char.charCodeAt(0);

        if (charCode === 13 || charCode === 10) {
          // Enter
          stdin.setRawMode(false);
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(password);
        } else if (charCode === 3) {
          // Ctrl+C
          process.exit(0);
        } else if (charCode === 127 || charCode === 8) {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(question + '*'.repeat(password.length));
          }
        } else if (charCode >= 32) {
          // 通常文字
          password += char;
          process.stdout.write('*');
        }
      };

      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * ログインコマンド
 */
export async function loginCommand(
  config: ClientConfig,
  options: {
    json?: boolean;
    username?: string;
    password?: string;
  } = {}
): Promise<void> {
  // ユーザー名とパスワードを取得
  let username = options.username || config.cognito.username;
  let password = options.password || config.cognito.password;

  // インタラクティブに入力を求める
  if (!username) {
    console.log(chalk.cyan('🔐 AgentCore ログイン'));
    console.log(chalk.gray(`Backend URL: ${config.backendUrl}`));
    console.log('');

    username = await prompt(chalk.blue('Username: '));
  }

  if (!password) {
    password = await prompt(chalk.blue('Password: '), true);
  }

  if (!username || !password) {
    console.log(chalk.red('❌ ユーザー名とパスワードが必要です'));
    process.exit(1);
  }

  // 設定を更新
  config.cognito.username = username;
  config.cognito.password = password;

  const spinner = ora('認証中...').start();

  try {
    const client = createBackendClient(config);
    const result = await client.testAuth();

    spinner.succeed(chalk.green('ログイン成功'));

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            success: true,
            user: result.user,
            authTime: result.authTime,
          },
          null,
          2
        )
      );
      return;
    }

    console.log('');
    console.log(chalk.bold('👤 ユーザー情報:'));
    console.log(`   ${chalk.blue('ID:')} ${result.user.user.id}`);
    console.log(`   ${chalk.blue('Username:')} ${result.user.user.username}`);
    if (result.user.user.email) {
      console.log(`   ${chalk.blue('Email:')} ${result.user.user.email}`);
    }
    if (result.user.user.groups && result.user.user.groups.length > 0) {
      console.log(`   ${chalk.blue('Groups:')} ${result.user.user.groups.join(', ')}`);
    }

    console.log('');
    console.log(chalk.gray(`認証時間: ${result.authTime}ms`));
    console.log('');
    console.log(
      chalk.yellow(
        '💡 ヒント: 認証情報を .env ファイルに保存することで、次回から自動ログインできます'
      )
    );
  } catch (error) {
    spinner.fail(chalk.red('ログイン失敗'));

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            success: false,
            error: error instanceof Error ? error.message : '不明なエラー',
          },
          null,
          2
        )
      );
      process.exit(1);
    }

    console.log('');
    console.log(chalk.red('❌ エラー詳細:'));
    console.log(chalk.red(`   ${error instanceof Error ? error.message : '不明なエラー'}`));

    console.log('');
    console.log(chalk.yellow('💡 トラブルシューティング:'));
    console.log(chalk.gray('   1. ユーザー名とパスワードを確認してください'));
    console.log(chalk.gray('   2. Cognito の設定を確認してください'));
    console.log(chalk.gray('   3. Backend URL が正しいか確認してください'));

    process.exit(1);
  }
}

/**
 * whoami コマンド - 現在のユーザー情報を表示
 */
export async function whoamiCommand(
  config: ClientConfig,
  options: {
    json?: boolean;
  } = {}
): Promise<void> {
  const spinner = ora('ユーザー情報を取得中...').start();

  try {
    const client = createBackendClient(config);
    const user = await client.getMe();

    spinner.succeed(chalk.green('ユーザー情報を取得しました'));

    if (options.json) {
      console.log(JSON.stringify(user, null, 2));
      return;
    }

    console.log('');
    console.log(chalk.bold('👤 ユーザー情報:'));
    console.log(`   ${chalk.blue('ID:')} ${user.user.id}`);
    console.log(`   ${chalk.blue('Username:')} ${user.user.username}`);
    if (user.user.email) {
      console.log(`   ${chalk.blue('Email:')} ${user.user.email}`);
    }
    if (user.user.groups && user.user.groups.length > 0) {
      console.log(`   ${chalk.blue('Groups:')} ${user.user.groups.join(', ')}`);
    }

    if (user.jwt) {
      console.log('');
      console.log(chalk.bold('🔑 JWT 情報:'));
      console.log(`   ${chalk.blue('Token Use:')} ${user.jwt.tokenUse}`);
      console.log(`   ${chalk.blue('Issuer:')} ${user.jwt.issuer}`);
      console.log(`   ${chalk.blue('Expires At:')} ${user.jwt.expiresAt}`);
    }
  } catch (error) {
    spinner.fail(chalk.red('ユーザー情報の取得に失敗しました'));

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            error: error instanceof Error ? error.message : '不明なエラー',
          },
          null,
          2
        )
      );
      process.exit(1);
    }

    console.log('');
    console.log(chalk.red('❌ エラー詳細:'));
    console.log(chalk.red(`   ${error instanceof Error ? error.message : '不明なエラー'}`));
    console.log('');
    console.log(chalk.yellow('💡 ログインが必要かもしれません: agentcore-client login'));

    process.exit(1);
  }
}
