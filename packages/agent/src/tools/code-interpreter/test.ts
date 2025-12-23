/**
 * CodeInterpreter ツールのテストコード
 * 実際の AWS 環境に対して接続して動作確認を行います
 */

import { AgentCoreCodeInterpreterClient } from './client.js';
import { logger } from '../../config/index.js';

async function testCodeInterpreter() {
  logger.info('🧪 CodeInterpreter ツールテスト開始');

  try {
    // テスト用のクライアントを作成
    const client = new AgentCoreCodeInterpreterClient({
      region: process.env.AWS_REGION || 'us-east-1',
      sessionName: `test-session-${Date.now()}`,
      autoCreate: true,
      persistSessions: false, // テスト後にクリーンアップ
    });

    logger.info('📝 Test 1: セッション初期化');
    const initResult = await client.initSession({
      action: 'initSession',
      sessionName: `test-session-${Date.now()}`,
      description: 'Test session for CodeInterpreter functionality',
    });

    if (initResult.status !== 'success') {
      throw new Error(`セッション初期化失敗: ${JSON.stringify(initResult)}`);
    }

    logger.info('✅ セッション初期化成功');
    console.log('セッション情報:', JSON.stringify(initResult.content[0], null, 2));

    logger.info('📝 Test 2: Python コード実行');
    const codeResult = await client.executeCode({
      action: 'executeCode',
      language: 'python',
      code: `
# フィボナッチ数列の最初の10個を計算
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

fib_numbers = [fibonacci(i) for i in range(10)]
print("フィボナッチ数列の最初の10個:")
print(fib_numbers)

# 簡単な計算
result = 2 ** 16
print(f"2の16乗: {result}")
`,
    });

    if (codeResult.status !== 'success') {
      throw new Error(`コード実行失敗: ${JSON.stringify(codeResult)}`);
    }

    logger.info('✅ Python コード実行成功');
    console.log('実行結果:', codeResult.content[0].text);

    logger.info('📝 Test 3: ファイル作成とファイル一覧表示');
    const writeResult = await client.writeFiles({
      action: 'writeFiles',
      content: [
        {
          path: 'test.txt',
          text: 'これはテストファイルです。\nCodeInterpreter の動作確認中...\n',
        },
        {
          path: 'data.json',
          text: JSON.stringify(
            {
              name: 'CodeInterpreter Test',
              version: '1.0.0',
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    });

    if (writeResult.status !== 'success') {
      throw new Error(`ファイル作成失敗: ${JSON.stringify(writeResult)}`);
    }

    logger.info('✅ ファイル作成成功');

    // ファイル一覧を表示
    const listResult = await client.listFiles({
      action: 'listFiles',
      path: '.',
    });

    if (listResult.status !== 'success') {
      throw new Error(`ファイル一覧取得失敗: ${JSON.stringify(listResult)}`);
    }

    logger.info('✅ ファイル一覧取得成功');
    console.log('ファイル一覧:', listResult.content[0].text);

    logger.info('📝 Test 4: ファイル読み取り');
    const readResult = await client.readFiles({
      action: 'readFiles',
      paths: ['test.txt', 'data.json'],
    });

    if (readResult.status !== 'success') {
      throw new Error(`ファイル読み取り失敗: ${JSON.stringify(readResult)}`);
    }

    logger.info('✅ ファイル読み取り成功');
    console.log('読み取り結果:', readResult.content[0].text);

    logger.info('📝 Test 5: データ処理とグラフ作成');
    const dataProcessingResult = await client.executeCode({
      action: 'executeCode',
      language: 'python',
      code: `
import json
import matplotlib.pyplot as plt
import numpy as np

# データファイルを読み込み
with open('data.json', 'r') as f:
    data = json.load(f)

print("読み込んだデータ:")
print(json.dumps(data, indent=2, ensure_ascii=False))

# サンプルデータでグラフを作成
x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(10, 6))
plt.plot(x, y, 'b-', linewidth=2)
plt.title('Sin Wave - CodeInterpreter Test')
plt.xlabel('X')
plt.ylabel('sin(X)')
plt.grid(True)
plt.savefig('sin_wave.png', dpi=300, bbox_inches='tight')
plt.close()

print("グラフを 'sin_wave.png' として保存しました")

# CSVファイルも作成
import pandas as pd

df = pd.DataFrame({
    'x': x[:10],
    'sin_x': np.sin(x[:10]),
    'cos_x': np.cos(x[:10])
})

df.to_csv('trigonometric_data.csv', index=False)
print("データを 'trigonometric_data.csv' として保存しました")
print(df.head())
`,
    });

    if (dataProcessingResult.status !== 'success') {
      throw new Error(`データ処理失敗: ${JSON.stringify(dataProcessingResult)}`);
    }

    logger.info('✅ データ処理とグラフ作成成功');
    console.log('データ処理結果:', dataProcessingResult.content[0].text);

    logger.info('📝 Test 6: コマンド実行');
    const commandResult = await client.executeCommand({
      action: 'executeCommand',
      command: 'ls -la *.png *.csv',
    });

    if (commandResult.status !== 'success') {
      logger.warn('⚠️ コマンド実行に失敗（ファイルが存在しない可能性）');
      console.log('コマンド実行結果:', commandResult.content[0].text);
    } else {
      logger.info('✅ コマンド実行成功');
      console.log('コマンド実行結果:', commandResult.content[0].text);
    }

    logger.info('📝 Test 7: ファイルダウンロード（オプショナル）');
    try {
      const downloadResult = await client.downloadFiles({
        action: 'downloadFiles',
        sourcePaths: ['test.txt', 'data.json', 'sin_wave.png', 'trigonometric_data.csv'],
        destinationDir: '/tmp/codeinterpreter-test',
      });

      if (downloadResult.status === 'success') {
        logger.info('✅ ファイルダウンロード成功');
        console.log('ダウンロード結果:', JSON.stringify(downloadResult.content[0], null, 2));
      } else {
        logger.warn('⚠️ ファイルダウンロード失敗');
        console.log('ダウンロードエラー:', downloadResult.content[0].text);
      }
    } catch (downloadError) {
      logger.warn('⚠️ ファイルダウンロードでエラー:', downloadError);
    }

    logger.info('📝 Test 8: セッション一覧表示');
    const sessionsResult = client.listLocalSessions();
    logger.info('✅ セッション一覧取得成功');
    console.log('セッション一覧:', JSON.stringify(sessionsResult.content[0], null, 2));

    // クリーンアップ
    logger.info('🧹 テスト完了 - クリーンアップ実行');
    await client.cleanup();

    logger.info('🎉 すべてのテストが正常に完了しました！');
  } catch (error) {
    logger.error('❌ テストでエラーが発生しました:', error);
    throw error;
  }
}

// テスト実行関数をエクスポート
export { testCodeInterpreter };

// 直接実行された場合はテストを開始
if (import.meta.url === `file://${process.argv[1]}`) {
  testCodeInterpreter().catch((error) => {
    console.error('テスト失敗:', error);
    process.exit(1);
  });
}
