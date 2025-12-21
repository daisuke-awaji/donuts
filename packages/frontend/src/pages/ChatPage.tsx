import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatContainer } from '../components/ChatContainer';
import { SessionSidebar } from '../components/SessionSidebar';
import { useChatStore, setNavigateFunction } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';
import { useUIStore } from '../stores/uiStore';

/**
 * チャットページ
 * - /chat: 新規チャット（sessionId なし）
 * - /chat/:sessionId: 既存セッションの継続
 */
export function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const { setSessionId, clearMessages, loadSessionHistory } = useChatStore();
  const { sessionEvents, activeSessionId, isLoadingEvents } = useSessionStore();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();

  // navigate 関数を chatStore に設定
  useEffect(() => {
    setNavigateFunction(navigate);
  }, [navigate]);

  // レスポンシブ対応: 768px未満でサイドバーを自動的に閉じる
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        // モバイル画面: サイドバーを閉じる
        setSidebarOpen(false);
      } else {
        // デスクトップ画面: サイドバーを開く
        setSidebarOpen(true);
      }
    };

    // 初回チェック
    if (mediaQuery.matches) {
      setSidebarOpen(false);
    }

    // リスナー登録
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [setSidebarOpen]);

  // URL の sessionId を store に同期するだけ
  useEffect(() => {
    console.log(`🔄 URL sessionId: ${sessionId || 'null'}`);

    if (sessionId) {
      // sessionId が存在する場合は store に設定
      setSessionId(sessionId);
    } else {
      // /chat（sessionId なし）の場合
      setSessionId(null);
      // 明示的に新規チャットを開始する場合のみメッセージクリア
      clearMessages();
    }
  }, [sessionId, setSessionId, clearMessages]);

  // セッション履歴を chatStore に復元
  useEffect(() => {
    if (
      sessionId &&
      activeSessionId === sessionId &&
      sessionEvents.length > 0 &&
      !isLoadingEvents
    ) {
      console.log(`📖 セッション履歴を ChatStore に復元: ${sessionId}`);
      loadSessionHistory(sessionEvents);
    }
  }, [sessionId, activeSessionId, sessionEvents, isLoadingEvents, loadSessionHistory]);

  return (
    <div className="flex h-full w-full">
      {/* サイドバー - 常に表示、幅のみ切り替え */}
      <div
        className={`
          transition-all duration-300 ease-in-out flex-shrink-0
          ${isSidebarOpen ? 'w-80' : 'w-16'}
        `}
      >
        <SessionSidebar />
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatContainer />
      </div>
    </div>
  );
}
