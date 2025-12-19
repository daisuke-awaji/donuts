import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { LoginForm } from './features/auth/LoginForm';
import { ChatContainer } from './components/ChatContainer';
import { getCurrentUserSession, validateCognitoConfig } from './lib/cognito';

function App() {
  const { isAuthenticated, setUser, setLoading, setError } = useAuthStore();

  useEffect(() => {
    // 初期化時にCognito設定を検証
    if (!validateCognitoConfig()) {
      setError('Cognito設定が不完全です。環境変数を確認してください。');
      return;
    }

    // 既存のセッションを確認
    const checkExistingSession = async () => {
      try {
        setLoading(true);
        const user = await getCurrentUserSession();

        if (user) {
          setUser(user);
        }
      } catch (error) {
        console.error('Session check error:', error);
        // セッションチェックエラーはユーザーに表示しない（単に未認証として扱う）
      } finally {
        setLoading(false);
      }
    };

    checkExistingSession();
  }, [setUser, setLoading, setError]);

  // 認証状態に応じて適切なコンポーネントを表示
  if (isAuthenticated) {
    return <ChatContainer />;
  }

  return <LoginForm />;
}

export default App;
