#!/usr/bin/env node

/**
 * AgentCore Client CLI
 * メインエントリーポイント
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from './config/index.js';
import { pingCommand } from './commands/ping.js';
import { invokeCommand, interactiveMode } from './commands/invoke.js';
import { configCommand, tokenInfoCommand, listProfilesCommand } from './commands/config.js';
import { loginCommand, whoamiCommand } from './commands/login.js';
import { listAgentsCommand, showAgentCommand, initAgentsCommand } from './commands/agents.js';

const program = new Command();

// プログラム情報
program.name('agentcore-client').description('CLI client for AgentCore Runtime').version('0.1.0');

// グローバルオプション
program
  .option('--endpoint <url>', 'エンドポイントURL')
  .option('--json', 'JSON形式で出力')
  .option('--machine-user', 'マシンユーザー認証を使用')
  .option('--target-user <userId>', '対象ユーザーID（マシンユーザーモード時）');

// Ping コマンド
program
  .command('ping')
  .description('Agent のヘルスチェック')
  .option('--json', 'JSON形式で出力')
  .action(async (options) => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      // オプションで設定を上書き
      if (globalOptions.endpoint) {
        config.endpoint = globalOptions.endpoint;
        // エンドポイントが変更されたら Runtime 判定を再実行
        config.isAwsRuntime =
          config.endpoint.includes('bedrock-agentcore') && config.endpoint.includes('/invocations');
      }

      await pingCommand(config, {
        json: options.json || globalOptions.json,
      });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Login コマンド
program
  .command('login')
  .description('ユーザー認証を行う')
  .option('--json', 'JSON形式で出力')
  .option('--username <username>', 'ユーザー名')
  .option('--password <password>', 'パスワード')
  .action(async (options) => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      await loginCommand(config, {
        json: options.json || globalOptions.json,
        username: options.username,
        password: options.password,
      });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Whoami コマンド
program
  .command('whoami')
  .description('現在のユーザー情報を表示')
  .option('--json', 'JSON形式で出力')
  .action(async (options) => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      await whoamiCommand(config, {
        json: options.json || globalOptions.json,
      });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Agents コマンドグループ
const agentsCommand = program.command('agents').description('エージェント管理');

agentsCommand
  .command('list')
  .description('エージェント一覧を表示')
  .option('--json', 'JSON形式で出力')
  .action(async (options) => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      await listAgentsCommand(config, {
        json: options.json || globalOptions.json,
      });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

agentsCommand
  .command('show <agentId>')
  .description('エージェント詳細を表示')
  .option('--json', 'JSON形式で出力')
  .action(async (agentId, options) => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      await showAgentCommand(agentId, config, {
        json: options.json || globalOptions.json,
      });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

agentsCommand
  .command('init')
  .description('デフォルトエージェントを初期化')
  .option('--json', 'JSON形式で出力')
  .action(async (options) => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      await initAgentsCommand(config, {
        json: options.json || globalOptions.json,
      });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Invoke コマンド
program
  .command('invoke')
  .description('Agent にプロンプトを送信')
  .argument('<prompt>', '送信するプロンプト')
  .option('--json', 'JSON形式で出力')
  .option('--session-id <id>', 'セッションID（会話の継続に使用）')
  .option('--agent <agentId>', 'エージェントIDを指定')
  .option('--select-agent', 'エージェントをインタラクティブに選択')
  .option('--no-auth', '認証なしで実行')
  .action(async (prompt, options) => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      // オプションで設定を上書き
      if (globalOptions.endpoint) {
        config.endpoint = globalOptions.endpoint;
        // エンドポイントが変更されたら Runtime 判定を再実行
        config.isAwsRuntime =
          config.endpoint.includes('bedrock-agentcore') && config.endpoint.includes('/invocations');
      }

      // マシンユーザーモードのオプション上書き
      if (globalOptions.machineUser) {
        config.authMode = 'machine';
      }
      if (globalOptions.targetUser && config.machineUser) {
        config.machineUser.targetUserId = globalOptions.targetUser;
      }

      // セッションIDの決定: CLI > 環境変数
      const sessionId = options.sessionId || process.env.SESSION_ID;

      await invokeCommand(prompt, config, {
        json: options.json || globalOptions.json,
        sessionId,
        agentId: options.agent,
        selectAgent: options.selectAgent,
      });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Interactive コマンド
program
  .command('interactive')
  .alias('i')
  .description('インタラクティブモードで Agent と対話')
  .action(async () => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      // オプションで設定を上書き
      if (globalOptions.endpoint) {
        config.endpoint = globalOptions.endpoint;
        // エンドポイントが変更されたら Runtime 判定を再実行
        config.isAwsRuntime =
          config.endpoint.includes('bedrock-agentcore') && config.endpoint.includes('/invocations');
      }

      // マシンユーザーモードのオプション上書き
      if (globalOptions.machineUser) {
        config.authMode = 'machine';
      }
      if (globalOptions.targetUser && config.machineUser) {
        config.machineUser.targetUserId = globalOptions.targetUser;
      }

      await interactiveMode(config);
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Config コマンド
program
  .command('config')
  .description('設定の表示・管理')
  .option('--validate', '設定の検証')
  .option('--json', 'JSON形式で出力')
  .action(async (options) => {
    try {
      const globalOptions = program.opts();

      await configCommand({
        json: options.json || globalOptions.json,
        endpoint: globalOptions.endpoint,
        validate: options.validate,
      });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Token コマンド
program
  .command('token')
  .description('JWT トークン情報の表示')
  .option('--machine', 'マシンユーザートークンを表示')
  .action(async (options) => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      // オプションで設定を上書き
      if (globalOptions.endpoint) {
        config.endpoint = globalOptions.endpoint;
        // エンドポイントが変更されたら Runtime 判定を再実行
        config.isAwsRuntime =
          config.endpoint.includes('bedrock-agentcore') && config.endpoint.includes('/invocations');
      }

      // マシンユーザーモードのオプション上書き
      if (options.machine || globalOptions.machineUser) {
        config.authMode = 'machine';
      }

      await tokenInfoCommand(config);
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Runtimes コマンド（旧 Profiles）
program
  .command('runtimes')
  .alias('profiles') // 後方互換性
  .description('利用可能なランタイム一覧')
  .action(() => {
    try {
      listProfilesCommand();
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// デフォルトアクション（引数なしの場合）
program.action(() => {
  console.log(chalk.cyan('🤖 AgentCore Client'));
  console.log('');
  console.log('使用方法:');
  console.log('  agentcore-client <command> [options]');
  console.log('');
  console.log(chalk.bold('認証コマンド:'));
  console.log('  login             ユーザー認証');
  console.log('  whoami            現在のユーザー情報を表示');
  console.log('');
  console.log(chalk.bold('エージェント管理:'));
  console.log('  agents list       エージェント一覧を表示');
  console.log('  agents show <id>  エージェント詳細を表示');
  console.log('  agents init       デフォルトエージェントを初期化');
  console.log('');
  console.log(chalk.bold('実行コマンド:'));
  console.log('  invoke <prompt>   Agent にプロンプトを送信');
  console.log('  interactive       インタラクティブモード');
  console.log('');
  console.log(chalk.bold('設定コマンド:'));
  console.log('  ping              Agent のヘルスチェック');
  console.log('  config            設定の表示・管理');
  console.log('  token             JWT トークン情報');
  console.log('  runtimes          ランタイム一覧');
  console.log('');
  console.log('例:');
  console.log('  agentcore-client login');
  console.log('  agentcore-client agents list');
  console.log('  agentcore-client invoke "Hello" --agent <agentId>');
  console.log('  agentcore-client invoke "Hello" --select-agent');
  console.log('');
  console.log('環境変数での設定:');
  console.log('  BACKEND_URL              Backend API URL');
  console.log('  AGENTCORE_ENDPOINT       Agent エンドポイント');
  console.log('  AGENTCORE_RUNTIME_ARN    AWS Runtime ARN');
  console.log('  COGNITO_USER_POOL_ID     Cognito User Pool ID');
  console.log('  COGNITO_CLIENT_ID        Cognito Client ID');
  console.log('  COGNITO_USERNAME         ユーザー名');
  console.log('  COGNITO_PASSWORD         パスワード');
  console.log('');
  console.log('詳細なヘルプ:');
  console.log('  agentcore-client --help');
  console.log('  agentcore-client <command> --help');
});

// エラーハンドリング
program.configureHelp({
  sortSubcommands: true,
});

program.showHelpAfterError();

// プログラム実行
try {
  program.parse(process.argv);

  // 引数が何も指定されていない場合はヘルプを表示
  if (process.argv.length <= 2) {
    program.help();
  }
} catch (error) {
  console.error(
    chalk.red(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  );
  process.exit(1);
}
