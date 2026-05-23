import { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';

// Centralized auth hook providing user info and admin status.
// Use this instead of repeating the Cognito group check in every component.
export function useAuth() {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [isAdmin, setIsAdmin] = useState(false);

  const userEmail = user?.signInDetails?.loginId || '';

  useEffect(() => {
    import('aws-amplify/auth').then(({ fetchAuthSession }) => {
      fetchAuthSession().then(session => {
        const groups = session.tokens?.idToken?.payload?.['cognito:groups'] || [];
        setIsAdmin(groups.includes('Admins'));
      }).catch(console.error);
    });
  }, []);

  return {
    user,
    userEmail,
    isAdmin,
    signOut,
  };
}
