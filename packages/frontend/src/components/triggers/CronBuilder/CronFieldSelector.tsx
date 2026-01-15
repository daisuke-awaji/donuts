/**
 * CronFieldSelector Component
 *
 * Individual field selectors for custom cron expressions
 */

import { useTranslation } from 'react-i18next';
import { DAY_OF_WEEK_OPTIONS, MONTH_OPTIONS, type CronFields } from './cronUtils';

export interface CronFieldSelectorProps {
  /**
   * Current field values
   */
  fields: CronFields;

  /**
   * Callback when a field changes
   */
  onChange: (field: string, value: string) => void;

  /**
   * Whether selectors are disabled
   */
  disabled?: boolean;
}

export function CronFieldSelector({ fields, onChange, disabled = false }: CronFieldSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
      {/* Minute */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('triggers.cron.minute')} (0-59)
        </label>
        <input
          type="text"
          value={fields.minute}
          onChange={(e) => onChange('minute', e.target.value)}
          disabled={disabled}
          placeholder="0, *, 0-30"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Hour */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('triggers.cron.hour')} (0-23)
        </label>
        <input
          type="text"
          value={fields.hour}
          onChange={(e) => onChange('hour', e.target.value)}
          disabled={disabled}
          placeholder="0, *, 9-17"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Day of Month */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('triggers.cron.dayOfMonth')} (1-31)
        </label>
        <input
          type="text"
          value={fields.dayOfMonth}
          onChange={(e) => onChange('dayOfMonth', e.target.value)}
          disabled={disabled}
          placeholder="1, *, ?, 1-15"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">? または * を使用</p>
      </div>

      {/* Month */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('triggers.cron.month')}
        </label>
        <select
          value={fields.month}
          onChange={(e) => onChange('month', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="*">すべて (*)</option>
          {MONTH_OPTIONS.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>

      {/* Day of Week */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('triggers.cron.dayOfWeek')}
        </label>
        <select
          value={fields.dayOfWeek}
          onChange={(e) => onChange('dayOfWeek', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="?">指定なし (?)</option>
          <option value="*">すべて (*)</option>
          <option value="MON-FRI">平日 (MON-FRI)</option>
          {DAY_OF_WEEK_OPTIONS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">? または * を使用</p>
      </div>

      {/* Year */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('triggers.cron.year')}
        </label>
        <input
          type="text"
          value={fields.year}
          onChange={(e) => onChange('year', e.target.value)}
          disabled={disabled}
          placeholder="*, 2024"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">通常は * を使用</p>
      </div>

      {/* Help Text */}
      <div className="col-span-2 md:col-span-3 mt-2">
        <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-md">
          <p className="font-medium mb-1">💡 ヒント:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>* = すべての値</li>
            <li>? = 指定なし（日または曜日で必須）</li>
            <li>0-5 = 範囲指定</li>
            <li>0,15,30 = 複数指定</li>
            <li>日と曜日は同時に指定できません（片方は ? にする必要があります）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
