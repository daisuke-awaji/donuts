/**
 * Settings Store
 * アプリケーション設定管理用のZustand store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 送信動作の設定値
 * - 'enter': Enter で送信、Shift+Enter で改行
 * - 'cmdEnter': Cmd/Ctrl+Enter で送信、Enter で改行
 */
export type SendBehavior = 'enter' | 'cmdEnter';

/**
 * Settings Store の状態
 */
interface SettingsState {
  // Enter キーの動作設定
  sendBehavior: SendBehavior;

  // アクション
  setSendBehavior: (behavior: SendBehavior) => void;
}

/**
 * Settings Store
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // 初期状態: デフォルトは Enter で送信
      sendBehavior: 'enter',

      /**
       * Enter キーの動作設定を変更
       */
      setSendBehavior: (behavior: SendBehavior) => {
        set({ sendBehavior: behavior });
        console.log(`[SettingsStore] Send behavior changed to: ${behavior}`);
      },
    }),
    {
      name: 'app-settings',
    }
  )
);
