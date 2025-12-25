/**
 * セッション同期カスタムフック
 * URL パラメータと sessionStore の状態を一元的に管理
 */

import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { useChatStore } from '../stores/chatStore';

export interface UseSessionSyncReturn {
  currentSessionId: string | null;
  isNewChat: boolean;
  createAndNavigateToNewSession: () => string;
}

/**
 * セッション同期フック
 *
 * URL の sessionId と Store の状態を同期し、
 * 新規セッション作成時のナビゲーションを管理します。
 *
 * @returns {UseSessionSyncReturn} セッション同期情報とアクション
 */
export function useSessionSync(): UseSessionSyncReturn {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const {
    activeSessionId,
    sessions,
    sessionEvents,
    isCreatingSession,
    selectSession,
    setActiveSessionId,
    clearActiveSession,
    createNewSession,
    finalizeNewSession,
  } = useSessionStore();

  const { messages, clearMessages, loadSessionHistory } = useChatStore();

  // URL → Store 同期
  useEffect(() => {
    // 新規セッション作成中は同期をスキップ（競合状態を回避）
    if (isCreatingSession) {
      console.log('⏳ 新規セッション作成中、URL同期をスキップ');
      return;
    }

    if (!urlSessionId) {
      // /chat の場合：新規チャット準備
      if (activeSessionId) {
        console.log('🗑️ 新規チャット準備のためアクティブセッションをクリア');
        clearActiveSession();
        clearMessages();
      }
      return;
    }

    // すでに同期済みの場合はスキップ
    if (urlSessionId === activeSessionId) {
      return;
    }

    // 既存セッションか新規セッションかを判定
    const isExistingSession = sessions.some((s) => s.sessionId === urlSessionId);

    if (isExistingSession) {
      // 既存セッション：メッセージをクリアして履歴を取得
      console.log(`📥 既存セッション選択: ${urlSessionId}`);
      clearMessages();
      selectSession(urlSessionId);
    } else {
      // 新規セッション：activeSessionId のみ更新（履歴取得はスキップ）
      console.log(`🆕 新規セッションとして設定: ${urlSessionId}`);
      setActiveSessionId(urlSessionId);
    }
  }, [
    urlSessionId,
    activeSessionId,
    sessions,
    messages.length,
    isCreatingSession,
    selectSession,
    setActiveSessionId,
    clearActiveSession,
    clearMessages,
  ]);

  // セッション履歴を chatStore に復元
  useEffect(() => {
    if (urlSessionId && activeSessionId === urlSessionId && sessionEvents.length > 0) {
      console.log(`📖 セッション履歴を ChatStore に復元: ${urlSessionId}`);
      loadSessionHistory(sessionEvents);
    }
  }, [urlSessionId, activeSessionId, sessionEvents, loadSessionHistory]);

  // 新規セッション作成 + ナビゲーション
  const createAndNavigateToNewSession = useCallback(() => {
    const newSessionId = createNewSession();
    navigate(`/chat/${newSessionId}`, { replace: true });

    // 少し遅延してフラグをリセット（URL同期が完了するのを待つ）
    setTimeout(() => {
      finalizeNewSession();
    }, 100);

    return newSessionId;
  }, [navigate, createNewSession, finalizeNewSession]);

  return {
    currentSessionId: urlSessionId || null,
    isNewChat: !urlSessionId,
    createAndNavigateToNewSession,
  };
}
