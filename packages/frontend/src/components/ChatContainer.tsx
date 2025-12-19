import React from 'react';
import { MessageSquare, Trash2, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export const ChatContainer: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { clearMessages, messages, sessionId } = useChatStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleClearChat = () => {
    clearMessages();
  };

  return (
    <div className="chat-container">
      {/* ヘッダー */}
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AgentCore Chat</h1>
              <p className="text-sm text-gray-500">
                {sessionId ? `セッション: ${sessionId.slice(0, 8)}...` : 'セッション未開始'}
                {messages.length > 0 && ` • ${messages.length} メッセージ`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* チャットクリアボタン */}
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="button-secondary text-sm inline-flex items-center gap-2"
              title="チャット履歴をクリア"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              クリア
            </button>
          )}

          {/* ユーザー情報とログアウト */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500">認証済み</p>
            </div>

            <button
              onClick={handleLogout}
              className="button-secondary text-sm inline-flex items-center gap-2"
              title="ログアウト"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メッセージリスト */}
      <MessageList />

      {/* メッセージ入力 */}
      <MessageInput />
    </div>
  );
};
