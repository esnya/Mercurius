import firebase from 'firebase/app';
import memoize from 'lodash/memoize';

import 'firebase/analytics';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/storage';

export const initializeApp = memoize(
  async (name?: string): Promise<firebase.app.App> => {
    const initRes = await fetch('/__/firebase/init.json');
    if (Math.floor(initRes.status / 100) !== 2) {
      throw new Error(await initRes.text());
    }

    const init = await initRes.json();

    const app = await firebase.initializeApp(init, name);
    app.auth();
    app.analytics();

    return app;
  },
);

export default firebase;
export const { auth, firestore, storage } = firebase;
export * from './types';
