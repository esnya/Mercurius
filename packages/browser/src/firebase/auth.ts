import { User, auth } from 'firebase/app';
import { initializeApp } from '.';

export async function initializeAuth(appName?: string): Promise<auth.Auth> {
  const app = await initializeApp(appName);
  return app.auth();
}

export async function getCurrentUser(
  timeout = 10000,
  appName?: string,
): Promise<User> {
  const auth = await initializeAuth(appName);

  const { currentUser } = auth;
  if (currentUser) return currentUser;

  return await new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = auth.onAuthStateChanged((user): void => {
      if (user) {
        resolve(user);
        if (timer !== null) clearTimeout(timer);
        unsubscribe();
      }
    });

    timer = setTimeout(() => {
      reject(new Error('Unauthorized'));
      unsubscribe();
    }, timeout);
  });
}

export async function signOut(): Promise<void> {
  const auth = await initializeAuth();
  await auth.signOut();
}
