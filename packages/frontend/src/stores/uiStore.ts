/**
 * UI状態管理ストア
 * サイドバーの開閉状態などのUI要素を管理する
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  /**
   * サイドバーが開いているかどうか
   */
  isSidebarOpen: boolean;

  /**
   * サイドバーの開閉を切り替える
   */
  toggleSidebar: () => void;

  /**
   * サイドバーの開閉状態を設定する
   * @param isOpen 開閉状態
   */
  setSidebarOpen: (isOpen: boolean) => void;
}

/**
 * UI状態管理ストア
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // デフォルトはサイドバー開いた状態
      isSidebarOpen: true,

      toggleSidebar: () =>
        set((state) => {
          const newState = !state.isSidebarOpen;
          console.log(`🔀 サイドバー切り替え: ${newState ? '開く' : '閉じる'}`);
          return { isSidebarOpen: newState };
        }),

      setSidebarOpen: (isOpen) =>
        set(() => {
          console.log(`📐 サイドバー状態設定: ${isOpen ? '開く' : '閉じる'}`);
          return { isSidebarOpen: isOpen };
        }),
    }),
    {
      name: 'ui-storage', // localStorage のキー名
      partialize: (state) => ({ isSidebarOpen: state.isSidebarOpen }), // 永続化する項目を指定
    }
  )
);
