/**
 * Agent 関連の型定義
 */

export interface Scenario {
  id: string;
  title: string; // シナリオ名（例: 「コードレビュー依頼」）
  prompt: string; // プロンプトテンプレート
}

export interface Agent {
  id: string; // UUID
  name: string; // Agent名
  description: string; // 説明
  systemPrompt: string; // システムプロンプト
  enabledTools: string[]; // 有効化されたツール名の配列
  scenarios: Scenario[]; // よく使うプロンプト
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent作成時の入力データ
 */
export interface CreateAgentInput {
  name: string;
  description: string;
  systemPrompt: string;
  enabledTools: string[];
  scenarios: Omit<Scenario, 'id'>[];
}

/**
 * Agent更新時の入力データ
 */
export interface UpdateAgentInput extends Partial<CreateAgentInput> {
  id: string;
}

/**
 * AgentStore の状態
 */
export interface AgentState {
  agents: Agent[];
  selectedAgent: Agent | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * AgentStore のアクション
 */
export interface AgentActions {
  // Agent CRUD
  createAgent: (input: CreateAgentInput) => Agent;
  updateAgent: (input: UpdateAgentInput) => void;
  deleteAgent: (id: string) => void;
  getAgent: (id: string) => Agent | undefined;

  // Agent選択
  selectAgent: (agent: Agent | null) => void;

  // 初期化・リセット
  initializeStore: () => void;
  clearError: () => void;

  // LocalStorage 操作
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

/**
 * AgentStore の完全な型
 */
export type AgentStore = AgentState & AgentActions;

/**
 * デフォルトAgent作成用のデータ
 */
export const DEFAULT_AGENTS: CreateAgentInput[] = [
  {
    name: '汎用アシスタント',
    description: '様々なタスクに対応できる汎用的なAIアシスタント',
    systemPrompt: `あなたは親切で知識豊富なAIアシスタントです。ユーザーの質問に対して、正確で分かりやすい回答を提供してください。

以下の点を心がけてください：
- 日本語で自然に回答する
- 専門的な内容も初心者にも理解しやすいように説明する
- 不明な点があれば素直に「分からない」と答える
- 必要に応じて追加の質問をする`,
    enabledTools: [],
    scenarios: [
      {
        title: '質問・相談',
        prompt: '以下について教えてください:\n\n',
      },
      {
        title: '文章の添削',
        prompt: '以下の文章を添削・改善してください:\n\n',
      },
      {
        title: 'Web 検索',
        prompt: 'Amazon Bedrock AgentCore Runtime のデプロイ方法について調査してください',
      },
      {
        title: '要約作成',
        prompt: '以下の内容を簡潔に要約してください:\n\n',
      },
      {
        title: 'アイディア出し',
        prompt: '以下のテーマでアイディアを10個出してください:\n\nテーマ: ',
      },
      {
        title: '比較・検討',
        prompt:
          '以下の選択肢について、メリット・デメリットを比較して検討してください:\n\n選択肢:\n1. \n2. \n3. ',
      },
    ],
  },
  {
    name: 'Code Review Agent',
    description: 'コードレビューとプログラミング支援に特化したAgent',
    systemPrompt: `あなたは経験豊富なソフトウェアエンジニアです。コードレビューとプログラミング支援を専門とします。

以下の観点でコードを評価してください：
- 可読性と保守性
- パフォーマンス
- セキュリティ
- ベストプラクティス
- バグの可能性

改善提案は具体的で実装可能なものを提供してください。`,
    enabledTools: [],
    scenarios: [
      {
        title: 'コードレビュー',
        prompt:
          '以下のコードをレビューしてください。改善点があれば具体的な提案をお願いします:\n\n```\n\n```',
      },
      {
        title: 'バグ調査',
        prompt:
          '以下のコードでバグが発生しています。原因を調査して修正案を提示してください:\n\n```\n\n```\n\nエラー内容:\n',
      },
      {
        title: 'リファクタリング',
        prompt: '以下のコードをより良い設計にリファクタリングしてください:\n\n```\n\n```',
      },
      {
        title: 'コード説明',
        prompt:
          '以下のコードが何をしているかを初心者にも分かりやすく説明してください:\n\n```\n\n```',
      },
      {
        title: 'パフォーマンス最適化',
        prompt: '以下のコードのパフォーマンスを最適化する方法を提案してください:\n\n```\n\n```',
      },
      {
        title: 'テストコード作成',
        prompt: '以下のコードに対するユニットテストを作成してください:\n\n```\n\n```',
      },
    ],
  },
  {
    name: 'Web Deep Researcher',
    description: 'Webを活用した深い調査・情報収集・分析を行うリサーチ特化型Agent',
    systemPrompt: `あなたはプロのリサーチャーです。Web検索ツールを活用して、深く正確な調査を行います。

以下の点を心がけてください：
- 複数の情報源から多角的に調査する
- 一次情報を重視し、信頼性を評価する
- 調査結果は構造化して分かりやすく整理する
- 情報の出典・ソースを明記する
- 不明点や矛盾点があれば正直に報告する
- 追加調査が必要な場合は提案する`,
    enabledTools: ['tavily-search'],
    scenarios: [
      {
        title: '市場・業界調査',
        prompt:
          '以下の業界/分野について、市場規模、主要プレイヤー、トレンドを調査してまとめてください:\n\n業界/分野: ',
      },
      {
        title: '競合分析',
        prompt: '以下の製品/サービスの競合を調査し、比較表を作成してください:\n\n製品/サービス: ',
      },
      {
        title: '技術トレンド調査',
        prompt: '以下の技術/キーワードに関する最新動向を調査してください:\n\n技術/キーワード: ',
      },
      {
        title: 'ニュース・動向まとめ',
        prompt: '以下のトピックに関する最新ニュース・動向をまとめてください:\n\nトピック: ',
      },
      {
        title: '製品・サービス比較',
        prompt:
          '以下のカテゴリの製品/サービスを比較調査し、メリット・デメリットを整理してください:\n\nカテゴリ: ',
      },
      {
        title: '事例・ベストプラクティス調査',
        prompt: '以下のテーマに関する成功事例やベストプラクティスを調査してください:\n\nテーマ: ',
      },
    ],
  },
];
