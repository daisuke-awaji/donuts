import React, { useState, useRef, useEffect } from 'react';
import { ZodError } from 'zod';
import { useChatStore } from '../stores/chatStore';
import { chatPromptSchema } from '../schemas/chat';

export const MessageInput: React.FC = () => {
  const { sendPrompt, isLoading, clearError } = useChatStore();
  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの自動リサイズ
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // バリデーション
    try {
      chatPromptSchema.parse({ prompt: value });
      setValidationError(null);
    } catch (err) {
      if (err instanceof ZodError && err.issues?.[0]?.message) {
        setValidationError(err.issues[0].message);
      }
    }

    // チャットストアのエラーをクリア
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) {
      return;
    }

    try {
      // バリデーション
      const validated = chatPromptSchema.parse({ prompt: input.trim() });

      // メッセージ送信
      await sendPrompt(validated.prompt);

      // 入力フィールドをクリア
      setInput('');
      setValidationError(null);
    } catch (err) {
      if (err instanceof ZodError && err.issues?.[0]?.message) {
        setValidationError(err.issues[0].message);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift + Enter で改行、Enter で送信
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-end space-x-4">
          {/* テキスト入力エリア */}
          <div className="flex-1">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力してください... (Shift+Enter で改行、Enter で送信)"
                className={`input-field min-h-[44px] max-h-[200px] resize-none ${
                  validationError ? 'border-red-300 focus:ring-red-300' : ''
                }`}
                disabled={isLoading}
                rows={1}
              />

              {/* 文字数カウンター */}
              <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                {input.length}/10000
              </div>
            </div>

            {/* バリデーションエラー表示 */}
            {validationError && <p className="mt-2 text-sm text-red-600">{validationError}</p>}

            {/* ヘルプテキスト */}
            <p className="mt-2 text-xs text-gray-500">Shift + Enter で改行、Enter で送信</p>
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !!validationError}
            className="button-primary flex items-center justify-center min-w-[100px] h-11 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                送信中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
                送信
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
