/**
 * Cron Builder Utility Functions
 *
 * AWS EventBridge Scheduler Cron format (6 fields):
 * minute hour day-of-month month day-of-week year
 *
 * Example: 0 9 * * MON-FRI * (Every weekday at 9:00 AM)
 */

export interface CronFields {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
  year: string;
}

export interface CronPreset {
  id: string;
  label: string;
  expression: string;
}

/**
 * Predefined cron presets
 */
export const CRON_PRESETS: CronPreset[] = [
  {
    id: 'everyMinute',
    label: 'triggers.cron.presetEveryMinute',
    expression: '* * * * ? *',
  },
  {
    id: 'everyHour',
    label: 'triggers.cron.presetEveryHour',
    expression: '0 * * * ? *',
  },
  {
    id: 'everyDay',
    label: 'triggers.cron.presetEveryDay',
    expression: '0 0 * * ? *',
  },
  {
    id: 'everyWeekday',
    label: 'triggers.cron.presetEveryWeekday',
    expression: '0 0 ? * MON-FRI *',
  },
  {
    id: 'everyMonday',
    label: 'triggers.cron.presetEveryMonday',
    expression: '0 0 ? * MON *',
  },
  {
    id: 'everyMonth',
    label: 'triggers.cron.presetEveryMonth',
    expression: '0 0 1 * ? *',
  },
];

/**
 * Parse cron expression into fields
 */
export function parseCronExpression(expression: string): CronFields | null {
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 6) {
    return null;
  }

  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4],
    year: parts[5],
  };
}

/**
 * Build cron expression from fields
 */
export function buildCronExpression(fields: CronFields): string {
  return `${fields.minute} ${fields.hour} ${fields.dayOfMonth} ${fields.month} ${fields.dayOfWeek} ${fields.year}`;
}

/**
 * Validate cron expression
 */
export function validateCronExpression(expression: string): boolean {
  const fields = parseCronExpression(expression);
  if (!fields) return false;

  // Basic validation - check that either dayOfMonth or dayOfWeek has '?'
  const hasDayOfMonth = fields.dayOfMonth !== '?';
  const hasDayOfWeek = fields.dayOfWeek !== '?';

  // Exactly one of dayOfMonth or dayOfWeek must be '?'
  if (hasDayOfMonth === hasDayOfWeek) {
    return false;
  }

  return true;
}

/**
 * Generate human-readable description of cron expression
 */
export function getCronDescription(expression: string, t: (key: string) => string): string {
  const fields = parseCronExpression(expression);
  if (!fields) {
    return t('triggers.cron.invalidExpression');
  }

  const parts: string[] = [];

  // Handle presets first
  const preset = CRON_PRESETS.find((p) => p.expression === expression);
  if (preset) {
    return t(preset.label);
  }

  // Minute
  if (fields.minute === '*') {
    parts.push(t('triggers.cron.presetEveryMinute'));
  } else if (fields.minute === '0') {
    // Handle in hour section
  } else {
    parts.push(`${fields.minute}分`);
  }

  // Hour
  if (fields.hour === '*') {
    if (fields.minute === '0') {
      parts.push(t('triggers.cron.presetEveryHour'));
    }
  } else if (fields.hour !== '*') {
    parts.push(`${fields.hour}:${fields.minute.padStart(2, '0')}`);
  }

  // Day of month
  if (fields.dayOfMonth !== '?' && fields.dayOfMonth !== '*') {
    parts.push(`${fields.dayOfMonth}日`);
  }

  // Day of week
  if (fields.dayOfWeek !== '?' && fields.dayOfWeek !== '*') {
    const dayNames: Record<string, string> = {
      MON: '月曜',
      TUE: '火曜',
      WED: '水曜',
      THU: '木曜',
      FRI: '金曜',
      SAT: '土曜',
      SUN: '日曜',
    };

    if (fields.dayOfWeek.includes('-')) {
      const [start, end] = fields.dayOfWeek.split('-');
      parts.push(`${dayNames[start]}〜${dayNames[end]}`);
    } else if (fields.dayOfWeek.includes(',')) {
      const days = fields.dayOfWeek
        .split(',')
        .map((d) => dayNames[d])
        .join('、');
      parts.push(days);
    } else {
      parts.push(dayNames[fields.dayOfWeek] || fields.dayOfWeek);
    }
  }

  // Month
  if (fields.month !== '*') {
    parts.push(`${fields.month}月`);
  }

  return parts.join(' ') || expression;
}

/**
 * Calculate next execution times for a cron expression
 */
export function getNextExecutions(
  expression: string,
  _timezone: string,
  count: number = 3
): Date[] {
  const fields = parseCronExpression(expression);
  if (!fields || !validateCronExpression(expression)) {
    return [];
  }

  const executions: Date[] = [];
  let current = new Date();

  // Simple implementation - in production, use a proper cron parser like cron-parser
  // This is a basic approximation for common cases
  // Note: timezone parameter is not used in this simplified version

  for (let i = 0; i < count && executions.length < count; i++) {
    const next = calculateNextExecution(current, fields);
    if (next) {
      executions.push(next);
      current = new Date(next.getTime() + 60000); // Add 1 minute
    } else {
      break;
    }
  }

  return executions;
}

/**
 * Calculate next execution time (simplified)
 */
function calculateNextExecution(from: Date, fields: CronFields): Date | null {
  // This is a simplified implementation
  // In production, use a library like cron-parser or cronitor-cron

  const next = new Date(from);

  // Handle minute
  if (fields.minute === '*') {
    next.setMinutes(next.getMinutes() + 1);
  } else if (fields.minute !== '*') {
    const targetMinute = parseInt(fields.minute, 10);
    if (next.getMinutes() >= targetMinute) {
      next.setHours(next.getHours() + 1);
    }
    next.setMinutes(targetMinute);
  }
  next.setSeconds(0);
  next.setMilliseconds(0);

  // Handle hour
  if (fields.hour !== '*') {
    const targetHour = parseInt(fields.hour, 10);
    if (next.getHours() > targetHour || (next.getHours() === targetHour && next.getMinutes() > 0)) {
      next.setDate(next.getDate() + 1);
    }
    next.setHours(targetHour);
  }

  // Handle day of week (simplified)
  if (fields.dayOfWeek !== '?' && fields.dayOfWeek !== '*') {
    const dayMap: Record<string, number> = {
      SUN: 0,
      MON: 1,
      TUE: 2,
      WED: 3,
      THU: 4,
      FRI: 5,
      SAT: 6,
    };

    if (fields.dayOfWeek.includes('-')) {
      // Range like MON-FRI
      const [start, end] = fields.dayOfWeek.split('-');
      const startDay = dayMap[start];
      const endDay = dayMap[end];
      const currentDay = next.getDay();

      if (currentDay < startDay || currentDay > endDay) {
        // Move to next start day
        const daysToAdd = (startDay - currentDay + 7) % 7 || 7;
        next.setDate(next.getDate() + daysToAdd);
      }
    } else {
      // Specific day like MON
      const targetDay = dayMap[fields.dayOfWeek];
      const currentDay = next.getDay();
      if (currentDay !== targetDay) {
        const daysToAdd = (targetDay - currentDay + 7) % 7 || 7;
        next.setDate(next.getDate() + daysToAdd);
      }
    }
  }

  // Handle day of month
  if (fields.dayOfMonth !== '?' && fields.dayOfMonth !== '*') {
    const targetDay = parseInt(fields.dayOfMonth, 10);
    if (next.getDate() > targetDay) {
      next.setMonth(next.getMonth() + 1);
    }
    next.setDate(targetDay);
  }

  return next;
}

/**
 * Format date for display
 */
export function formatExecutionTime(date: Date): string {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  });
}

/**
 * Available timezones (subset for common usage)
 */
export const TIMEZONES = [
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'UTC', label: 'UTC' },
];

/**
 * Day of week options
 */
export const DAY_OF_WEEK_OPTIONS = [
  { value: 'MON', label: '月曜' },
  { value: 'TUE', label: '火曜' },
  { value: 'WED', label: '水曜' },
  { value: 'THU', label: '木曜' },
  { value: 'FRI', label: '金曜' },
  { value: 'SAT', label: '土曜' },
  { value: 'SUN', label: '日曜' },
];

/**
 * Month options
 */
export const MONTH_OPTIONS = [
  { value: '1', label: '1月' },
  { value: '2', label: '2月' },
  { value: '3', label: '3月' },
  { value: '4', label: '4月' },
  { value: '5', label: '5月' },
  { value: '6', label: '6月' },
  { value: '7', label: '7月' },
  { value: '8', label: '8月' },
  { value: '9', label: '9月' },
  { value: '10', label: '10月' },
  { value: '11', label: '11月' },
  { value: '12', label: '12月' },
];
