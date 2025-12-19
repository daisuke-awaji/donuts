import React from 'react';
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
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
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
              className="button-secondary text-sm"
              title="チャット履歴をクリア"
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v1h10V3a1 1 0 112 0v1h1a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1zM6 8a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              クリア
            </button>
          )}

          {/* ユーザー情報とログアウト */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500">認証済み</p>
            </div>

            <button onClick={handleLogout} className="button-secondary text-sm" title="ログアウト">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                  clipRule="evenodd"
                />
              </svg>
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
