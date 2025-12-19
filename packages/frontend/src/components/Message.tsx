import React from 'react';
import type { Message as MessageType } from '../types/index';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.type === 'user';

  return (
    <div className={`flex mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start max-w-4xl`}>
        {/* アバター */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isUser ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isUser ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            )}
          </div>
        </div>

        {/* メッセージバブル */}
        <div
          className={`relative ${
            isUser ? 'message-bubble message-user' : 'message-bubble message-assistant'
          } ${message.isStreaming ? 'bg-opacity-90' : ''}`}
        >
          {/* メッセージ内容 */}
          <div className="prose prose-sm max-w-none">
            {message.content ? (
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            ) : (
              <div className="text-gray-500 italic">
                {message.isStreaming ? 'メッセージを生成中...' : 'メッセージがありません'}
              </div>
            )}
          </div>

          {/* ストリーミングインジケーター */}
          {message.isStreaming && (
            <div className="flex items-center mt-2 text-gray-500">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
              <span className="ml-2 text-xs">生成中...</span>
            </div>
          )}

          {/* タイムスタンプ */}
          <div className={`mt-2 text-xs text-gray-500 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(message.timestamp).toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
