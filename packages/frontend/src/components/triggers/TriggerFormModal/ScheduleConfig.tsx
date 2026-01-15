/**
 * ScheduleConfig Component
 *
 * Schedule configuration using CronBuilder
 */

import { CronBuilder } from '../CronBuilder';

export interface ScheduleConfigProps {
  cronExpression: string;
  timezone: string;
  onCronChange: (expression: string) => void;
  onTimezoneChange: (timezone: string) => void;
  disabled?: boolean;
}

export function ScheduleConfig({
  cronExpression,
  timezone,
  onCronChange,
  onTimezoneChange,
  disabled = false,
}: ScheduleConfigProps) {
  return (
    <div className="border-t pt-6">
      <CronBuilder
        value={cronExpression}
        timezone={timezone}
        onChange={onCronChange}
        onTimezoneChange={onTimezoneChange}
        disabled={disabled}
      />
    </div>
  );
}
