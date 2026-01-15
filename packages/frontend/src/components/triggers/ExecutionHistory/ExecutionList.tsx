/**
 * ExecutionList Component
 *
 * List of execution records with details
 */

import { useTranslation } from 'react-i18next';
import { ExecutionItem } from './ExecutionItem';
import { LoadingIndicator } from '../../ui/LoadingIndicator';
import type { ExecutionRecord } from '../../../types/trigger';

export interface ExecutionListProps {
  executions: ExecutionRecord[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function ExecutionList({ executions, isLoading, hasMore, onLoadMore }: ExecutionListProps) {
  const { t } = useTranslation();

  if (isLoading && executions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingIndicator />
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('triggers.history.noHistory')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {executions.map((execution) => (
        <ExecutionItem key={execution.executionId} execution={execution} />
      ))}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('common.loading') : t('triggers.history.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
