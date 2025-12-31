import 'react-i18next';

// TypeScript で翻訳キーの補完を有効化
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof import('../locales/ja.yaml');
    };
  }
}
