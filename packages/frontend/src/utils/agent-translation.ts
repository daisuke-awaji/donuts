/**
 * Agent 翻訳ユーティリティ
 * 翻訳キー形式の Agent データを現在の言語で翻訳するヘルパー関数
 */

import type { TFunction } from 'i18next';
import type { Agent, Scenario } from '../types/agent';

/**
 * 翻訳キーかどうかを判定
 * "defaultAgents." で始まる文字列を翻訳キーとみなす
 */
export const isTranslationKey = (text: string): boolean => {
  return text.startsWith('defaultAgents.');
};

/**
 * テキストが翻訳キーなら翻訳を適用、そうでなければそのまま返す
 *
 * @param text - 翻訳対象のテキスト（翻訳キーまたは通常のテキスト）
 * @param t - i18next の翻訳関数
 * @returns 翻訳されたテキスト、または元のテキスト
 */
export const translateIfKey = (text: string, t: TFunction): string => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  if (isTranslationKey(text)) {
    const translated = t(text);
    // 翻訳が見つからない場合はキーが返されるので、その場合は元のテキストを返す
    return translated === text ? text : translated;
  }

  return text;
};

/**
 * Scenario の表示用テキストを翻訳
 *
 * @param scenario - 翻訳対象の Scenario
 * @param t - i18next の翻訳関数
 * @returns 翻訳された Scenario
 */
export const translateScenario = (scenario: Scenario, t: TFunction): Scenario => {
  return {
    ...scenario,
    title: translateIfKey(scenario.title, t),
    prompt: translateIfKey(scenario.prompt, t),
  };
};

/**
 * Agent の表示用テキストを翻訳
 * name, description, scenarios の翻訳キーを現在の言語に変換
 * systemPrompt は翻訳しない（実テキストのまま）
 *
 * @param agent - 翻訳対象の Agent
 * @param t - i18next の翻訳関数
 * @returns 翻訳された Agent
 */
export const translateAgent = (agent: Agent, t: TFunction): Agent => {
  return {
    ...agent,
    name: translateIfKey(agent.name, t),
    description: translateIfKey(agent.description, t),
    scenarios: agent.scenarios.map((scenario) => translateScenario(scenario, t)),
  };
};

/**
 * Agent 配列の表示用テキストを翻訳
 *
 * @param agents - 翻訳対象の Agent 配列
 * @param t - i18next の翻訳関数
 * @returns 翻訳された Agent 配列
 */
export const translateAgents = (agents: Agent[], t: TFunction): Agent[] => {
  return agents.map((agent) => translateAgent(agent, t));
};
