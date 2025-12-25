import { ChatContainer } from '../components/ChatContainer';
import { useSessionSync } from '../hooks/useSessionSync';

/**
 * チャットページ
 * - /chat: 新規チャット（sessionId なし）
 * - /chat/:sessionId: 既存セッションの継続
 */
export function ChatPage() {
  const { currentSessionId, createAndNavigateToNewSession } = useSessionSync();

  return (
    <ChatContainer sessionId={currentSessionId} onCreateSession={createAndNavigateToNewSession} />
  );
}
