/**
 * CronBuilder Component
 *
 * AWS EventBridge Scheduler Cron expression builder with presets and custom fields
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CronPresetButtons } from './CronPresetButtons';
import { CronFieldSelector } from './CronFieldSelector';
import { CronPreview } from './CronPreview';
import {
  parseCronExpression,
  buildCronExpression,
  validateCronExpression,
  CRON_PRESETS,
  TIMEZONES,
} from './cronUtils';

export interface CronBuilderProps {
  value: string;
  timezone: string;
  onChange: (expression: string) => void;
  onTimezoneChange: (timezone: string) => void;
  disabled?: boolean;
}

export function CronBuilder({
  value,
  timezone,
  onChange,
  onTimezoneChange,
  disabled = false,
}: CronBuilderProps) {
  const { t } = useTranslation();

  // Check if current value is a preset
  const isPreset = CRON_PRESETS.some((preset) => preset.expression === value);
  const [isCustom, setIsCustom] = useState(!isPreset);

  // Parse current value to get fields
  const fields = parseCronExpression(value) || {
    minute: '0',
    hour: '0',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '?',
    year: '*',
  };

  // Handle preset selection
  const handlePresetSelect = (presetExpression: string) => {
    setIsCustom(false);
    onChange(presetExpression);
  };

  // Handle custom mode toggle
  const handleCustomToggle = () => {
    setIsCustom(true);
  };

  // Handle field change
  const handleFieldChange = (field: string, newValue: string) => {
    const newFields = { ...fields, [field]: newValue };

    // Ensure day of month and day of week exclusivity
    if (field === 'dayOfMonth') {
      if (newValue !== '?') {
        newFields.dayOfWeek = '?';
      }
    } else if (field === 'dayOfWeek') {
      if (newValue !== '?') {
        newFields.dayOfMonth = '?';
      }
    }

    const expression = buildCronExpression(newFields);
    onChange(expression);
  };

  const isValid = validateCronExpression(value);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{t('triggers.cron.title')}</h3>
      </div>

      {/* Timezone Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('triggers.cron.timezone')}
        </label>
        <select
          value={timezone}
          onChange={(e) => onTimezoneChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Preset Buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('triggers.cron.preset')}
        </label>
        <CronPresetButtons
          selectedExpression={value}
          onSelect={handlePresetSelect}
          onCustom={handleCustomToggle}
          disabled={disabled}
        />
      </div>

      {/* Custom Fields (shown when custom mode is active) */}
      {isCustom && (
        <div>
          <CronFieldSelector fields={fields} onChange={handleFieldChange} disabled={disabled} />
        </div>
      )}

      {/* Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('triggers.cron.preview')}
        </label>
        <CronPreview expression={value} timezone={timezone} isValid={isValid} />
      </div>

      {/* Validation Error */}
      {!isValid && (
        <div className="text-sm text-red-600">{t('triggers.cron.invalidExpression')}</div>
      )}
    </div>
  );
}
