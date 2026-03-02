import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useEffect, useState } from 'react';
import type { AuthState, UserRole } from './useAuth';

export function useRealAuth(): Omit<AuthState, 'preferredLanguage'> {
  const { user, authStatus } = useAuthenticator(ctx => [ctx.user, ctx.authStatus]);
  const [role, setRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      setRole(null);
      setUserName(null);
      setIsLoading(authStatus === 'configuring');
      return;
    }
    fetchAuthSession()
      .then(session => {
        const groups: string[] =
          (session.tokens?.idToken?.payload?.['cognito:groups'] as string[]) ?? [];
        if (groups.includes('APP_ADMINS')) setRole('APP_ADMINS');
        else if (groups.includes('PROJECT_ADMINS')) setRole('PROJECT_ADMINS');
        else setRole('TRANSCRIBERS');

        const attrs = session.tokens?.idToken?.payload;
        const name = [attrs?.['given_name'], attrs?.['family_name']]
          .filter(Boolean).join(' ') || (user?.signInDetails?.loginId ?? null);
        setUserName(name as string | null);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [authStatus, user]);

  return {
    role,
    userId: user?.userId ?? null,
    userEmail: user?.signInDetails?.loginId ?? null,
    userName,
    isLoading,
  };
}
