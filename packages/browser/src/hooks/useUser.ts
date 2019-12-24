import useFirebase from './useFirebase';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import useAsyncEffect from './useAsyncEffect';
import { isFailed, isSucceeded } from '../utilities/types';

export interface User {
  uid: string;
  name: string;
}

export default function useUser(): User | Error | undefined {
  const app = useFirebase();
  const history = useHistory();
  const [user, setUser] = useState<{ uid: string, name?: string }>();

  const auth = isSucceeded(app) ? app.auth() : undefined;

  useEffect((): void | (() => void) => {
    if (!auth) return;

    if (auth.currentUser) setUser(auth.currentUser);

    return auth.onAuthStateChanged((u): void => setUser(u ?? undefined));
  }, [auth]);

  useAsyncEffect(async (): Promise<void> => {
    if (!app || app instanceof Error) {
      return;
    }

    if (!user) {
      history.push('/sign-in');
      return;
    }

    const snapshot = await app.firestore().collection('users').doc(user.uid).get();
    const name = snapshot.get('name');

    if (!name) {
      history.push('/sign-in');
      return;
    }

    setUser(prev => prev && ({ ...prev, name }));
  }, [app, user]);

  if (!app || !user) return;

  if (isFailed(app)) return app;

  const {
    uid,
    name,
  } = user;
  if (!name) return;

  return {
    uid,
    name,
  };
}
