import React, { useState, useRef, useEffect } from 'react';
import { Trash2, LogOut, User, Bot } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useSelectedAgent } from '../stores/agentStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { AgentSelectorModal } from './AgentSelectorModal';
import type { Agent } from '../types/agent';

export const ChatContainer: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { clearMessages, messages } = useChatStore();
  const selectedAgent = useSelectedAgent();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [selectedScenarioPrompt, setSelectedScenarioPrompt] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // シナリオクリック処理
  const handleScenarioClick = (prompt: string) => {
    setSelectedScenarioPrompt(prompt);
  };

  // シナリオプロンプト取得関数（MessageInputに渡す）
  const getScenarioPrompt = () => {
    const prompt = selectedScenarioPrompt;
    if (prompt) {
      setSelectedScenarioPrompt(null); // 一度だけ使用
    }
    return prompt;
  };

  // Agent選択処理
  const handleAgentSelect = (agent: Agent | null) => {
    // Agent選択は AgentStore で管理されているのでここでは何もしない
    console.log('Agent selected:', agent?.name || 'None');
  };

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="chat-container">
      {/* ヘッダー */}
      <header className="flex items-center justify-between p-4 bg-white">
        <div className="flex items-center">
          <div>
            <button
              onClick={() => setIsAgentModalOpen(true)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <Bot className="w-6 h-6 text-gray-700" />
              <h1 className="text-lg font-semibold text-gray-900">
                {selectedAgent ? selectedAgent.name : '汎用アシスタント'}
              </h1>
            </button>
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

          {/* ユーザードロップダウン */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleDropdown}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors duration-200"
              title="ユーザーメニュー"
            >
              <User className="w-4 h-4 text-gray-600" />
            </button>

            {/* ドロップダウンメニュー */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-200 py-2 z-10">
                {/* ユーザー情報 */}
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                  <p className="text-xs text-gray-500">認証済み</p>
                </div>

                {/* ログアウト */}
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* メッセージリスト */}
      <MessageList onScenarioClick={handleScenarioClick} />

      {/* メッセージ入力 */}
      <MessageInput getScenarioPrompt={getScenarioPrompt} />

      {/* Agent選択モーダル */}
      <AgentSelectorModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        onAgentSelect={handleAgentSelect}
      />
    </div>
  );
};
