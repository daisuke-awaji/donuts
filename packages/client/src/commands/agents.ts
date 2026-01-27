/**
 * Agents Command
 * エージェント管理コマンド
 */

import chalk from 'chalk';
import ora from 'ora';
import type { ClientConfig } from '../config/index.js';
import { createBackendClient } from '../api/backend-client.js';
import type { Agent } from '../types/backend.js';

/**
 * エージェント一覧を表示
 */
export async function listAgentsCommand(
  config: ClientConfig,
  options: {
    json?: boolean;
  } = {}
): Promise<void> {
  const spinner = ora('エージェント一覧を取得中...').start();

  try {
    const client = createBackendClient(config);
    const agents = await client.listAgents();

    spinner.succeed(chalk.green(`${agents.length} 件のエージェントを取得しました`));

    if (options.json) {
      console.log(JSON.stringify(agents, null, 2));
      return;
    }

    if (agents.length === 0) {
      console.log('');
      console.log(chalk.yellow('エージェントが見つかりません'));
      console.log(
        chalk.gray('💡 ヒント: agentcore-client agents init でデフォルトエージェントを作成できます')
      );
      return;
    }

    console.log('');
    printAgentTable(agents);

    console.log('');
    console.log(chalk.gray('💡 使用方法:'));
    console.log(chalk.gray('   詳細表示: agentcore-client agents show <agentId>'));
    console.log(chalk.gray('   実行: agentcore-client invoke "prompt" --agent <agentId>'));
  } catch (error) {
    spinner.fail(chalk.red('エージェント一覧の取得に失敗しました'));

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

    process.exit(1);
  }
}

/**
 * エージェント詳細を表示
 */
export async function showAgentCommand(
  agentId: string,
  config: ClientConfig,
  options: {
    json?: boolean;
  } = {}
): Promise<void> {
  const spinner = ora(`エージェント "${agentId}" を取得中...`).start();

  try {
    const client = createBackendClient(config);
    const agent = await client.getAgent(agentId);

    spinner.succeed(chalk.green('エージェントを取得しました'));

    if (options.json) {
      console.log(JSON.stringify(agent, null, 2));
      return;
    }

    console.log('');
    printAgentDetails(agent);

    const resolvedAgentId = getAgentId(agent);
    console.log('');
    console.log(chalk.gray('💡 使用方法:'));
    console.log(chalk.gray(`   実行: agentcore-client invoke "prompt" --agent ${resolvedAgentId}`));
  } catch (error) {
    spinner.fail(chalk.red('エージェントの取得に失敗しました'));

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

    if (error instanceof Error && error.message.includes('404')) {
      console.log('');
      console.log(chalk.yellow('💡 エージェントが見つかりません。一覧を確認してください:'));
      console.log(chalk.gray('   agentcore-client agents list'));
    }

    process.exit(1);
  }
}

/**
 * デフォルトエージェントを初期化
 */
export async function initAgentsCommand(
  config: ClientConfig,
  options: {
    json?: boolean;
  } = {}
): Promise<void> {
  const spinner = ora('デフォルトエージェントを初期化中...').start();

  try {
    const client = createBackendClient(config);
    const agents = await client.initializeDefaultAgents();

    spinner.succeed(chalk.green(`${agents.length} 件のエージェントを初期化しました`));

    if (options.json) {
      console.log(JSON.stringify(agents, null, 2));
      return;
    }

    if (agents.length === 0) {
      console.log('');
      console.log(chalk.yellow('エージェントは既に初期化されています'));
      return;
    }

    console.log('');
    printAgentTable(agents);
  } catch (error) {
    spinner.fail(chalk.red('エージェントの初期化に失敗しました'));

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

    process.exit(1);
  }
}

/**
 * エージェント選択（インタラクティブ）
 */
export async function selectAgentInteractive(config: ClientConfig): Promise<Agent | null> {
  const spinner = ora('エージェント一覧を取得中...').start();

  try {
    const client = createBackendClient(config);
    const agents = await client.listAgents();

    spinner.stop();

    if (agents.length === 0) {
      console.log(chalk.yellow('エージェントが見つかりません'));
      console.log(
        chalk.gray('💡 ヒント: agentcore-client agents init でデフォルトエージェントを作成できます')
      );
      return null;
    }

    console.log('');
    console.log(chalk.bold('🤖 利用可能なエージェント:'));
    console.log('');

    agents.forEach((agent, index) => {
      const icon = agent.icon || '🤖';
      console.log(`  ${chalk.cyan(`${index + 1}.`)} ${icon} ${chalk.bold(agent.name)}`);
      console.log(`     ${chalk.gray(agent.description)}`);
      console.log(`     ${chalk.gray(`ID: ${agent.id}`)}`);
      console.log('');
    });

    // インタラクティブ選択
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(chalk.blue(`エージェントを選択 (1-${agents.length}): `), (answer) => {
        rl.close();

        const index = parseInt(answer, 10) - 1;
        if (isNaN(index) || index < 0 || index >= agents.length) {
          console.log(chalk.red('無効な選択です'));
          resolve(null);
          return;
        }

        const selected = agents[index];
        console.log('');
        console.log(chalk.green(`✓ 選択: ${selected.name} (${selected.id})`));
        resolve(selected);
      });
    });
  } catch (error) {
    spinner.fail(chalk.red('エージェント一覧の取得に失敗しました'));
    console.log(chalk.red(`   ${error instanceof Error ? error.message : '不明なエラー'}`));
    return null;
  }
}

/**
 * エージェントIDを取得（id または agentId をサポート）
 */
function getAgentId(agent: Agent): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return agent.id || (agent as any).agentId || 'unknown';
}

/**
 * エージェントテーブル表示
 */
function printAgentTable(agents: Agent[]): void {
  // カラム幅を計算
  const idWidth = Math.max(4, ...agents.map((a) => getAgentId(a).length));
  const nameWidth = Math.max(8, ...agents.map((a) => (a.name || '').length));
  const descWidth = Math.min(40, Math.max(12, ...agents.map((a) => (a.description || '').length)));

  // ヘッダー
  const header = [
    chalk.bold('ID'.padEnd(idWidth)),
    chalk.bold('Name'.padEnd(nameWidth)),
    chalk.bold('Description'.padEnd(descWidth)),
    chalk.bold('Tools'),
  ].join(' │ ');

  const separator = [
    '─'.repeat(idWidth),
    '─'.repeat(nameWidth),
    '─'.repeat(descWidth),
    '─'.repeat(8),
  ].join('─┼─');

  console.log(header);
  console.log(separator);

  // 行データ
  agents.forEach((agent) => {
    const desc = agent.description || '';
    const description = desc.length > descWidth ? desc.substring(0, descWidth - 3) + '...' : desc;

    const enabledTools = agent.enabledTools || [];
    const agentId = getAgentId(agent);

    const row = [
      chalk.cyan(agentId.padEnd(idWidth)),
      (agent.name || '').padEnd(nameWidth),
      description.padEnd(descWidth),
      chalk.gray(`${enabledTools.length} 個`),
    ].join(' │ ');

    console.log(row);
  });
}

/**
 * エージェント詳細表示
 */
function printAgentDetails(agent: Agent): void {
  console.log(chalk.bold(`${agent.icon || '🤖'} ${agent.name || 'Unknown'}`));
  console.log(chalk.gray('─'.repeat(50)));
  console.log('');

  console.log(`${chalk.blue('ID:')} ${getAgentId(agent)}`);
  console.log(`${chalk.blue('Description:')} ${agent.description || ''}`);

  if (agent.isShared !== undefined) {
    console.log(`${chalk.blue('Shared:')} ${agent.isShared ? 'Yes' : 'No'}`);
  }

  console.log('');
  console.log(chalk.bold('📝 System Prompt:'));
  console.log(chalk.gray('─'.repeat(50)));

  // システムプロンプトを整形して表示（最大500文字）
  const systemPrompt =
    agent.systemPrompt.length > 500
      ? agent.systemPrompt.substring(0, 500) + '...'
      : agent.systemPrompt;
  console.log(systemPrompt);

  const enabledTools = agent.enabledTools || [];
  console.log('');
  console.log(chalk.bold(`🔧 Enabled Tools (${enabledTools.length}):`));
  if (enabledTools.length > 0) {
    enabledTools.forEach((tool) => {
      console.log(`   • ${tool}`);
    });
  } else {
    console.log(chalk.gray('   なし'));
  }

  if (agent.scenarios && agent.scenarios.length > 0) {
    console.log('');
    console.log(chalk.bold(`💡 Scenarios (${agent.scenarios.length}):`));
    agent.scenarios.forEach((scenario, index) => {
      console.log(`   ${index + 1}. ${scenario.title}`);
      console.log(chalk.gray(`      "${scenario.prompt}"`));
    });
  }

  if (agent.createdAt) {
    console.log('');
    console.log(chalk.gray(`Created: ${new Date(agent.createdAt).toLocaleString()}`));
  }
  if (agent.updatedAt) {
    console.log(chalk.gray(`Updated: ${new Date(agent.updatedAt).toLocaleString()}`));
  }
}
