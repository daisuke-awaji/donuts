/**
 * InputMessageConfig Component
 *
 * Input message configuration for trigger
 */

import { useTranslation } from 'react-i18next';

export interface InputMessageConfigProps {
  inputMessage: string;
  onChange: (message: string) => void;
  disabled?: boolean;
}

export function InputMessageConfig({
  inputMessage,
  onChange,
  disabled = false,
}: InputMessageConfigProps) {
  const { t } = useTranslation();

  return (
    <div className="border-t pt-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('triggers.form.inputMessage')} <span className="text-red-500">*</span>
        </label>
        <textarea
          value={inputMessage}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('triggers.form.inputMessagePlaceholder')}
          disabled={disabled}
          maxLength={2000}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-500">{t('triggers.form.inputMessagePlaceholder')}</p>
          <p className="text-xs text-gray-500">{inputMessage.length} / 2000</p>
        </div>
      </div>
    </div>
  );
}
