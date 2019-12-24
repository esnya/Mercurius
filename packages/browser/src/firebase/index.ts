import firebase from 'firebase/app';
import memoize from 'lodash/memoize';

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

    return await firebase.initializeApp(init, name);
  },
);

export default firebase;
export const { auth, firestore, storage } = firebase;
export * from './types';
