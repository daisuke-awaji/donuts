/**
 * Tooltip Component
 * 汎用的なツールチップコンポーネント
 */

import { useState } from 'react';
import type { ReactNode } from 'react';

export interface TooltipProps {
  /** ツールチップを表示するトリガー要素 */
  children: ReactNode;
  /** ツールチップに表示するコンテンツ */
  content: ReactNode;
  /** ツールチップの表示位置 */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** 最大幅（デフォルト: 240px） */
  maxWidth?: string;
}

/**
 * ホバー時にツールチップを表示する汎用コンポーネント
 */
export function Tooltip({ children, content, position = 'top', maxWidth = '240px' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  // 位置に応じたスタイルクラス
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  // 矢印の位置に応じたスタイルクラス
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {/* ツールチップ本体 */}
      {isVisible && (
        <div
          className={`
            absolute z-50
            ${positionClasses[position]}
            pointer-events-none
          `}
          style={{ maxWidth }}
        >
          {/* 吹き出し背景 */}
          <div className="relative bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
            {content}

            {/* 矢印 */}
            <div
              className={`
                absolute w-0 h-0
                border-4 border-transparent
                ${arrowClasses[position]}
              `}
            />
          </div>
        </div>
      )}
    </div>
  );
}
