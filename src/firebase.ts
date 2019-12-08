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

export const Timestamp = firebase.firestore.Timestamp;
export type Timestamp = firebase.firestore.Timestamp;
export const FieldValue = firebase.firestore.FieldValue;
export type FieldValue = firebase.firestore.FieldValue;
export type DocumentReference = firebase.firestore.DocumentReference;
export type CollectionReference = firebase.firestore.CollectionReference;
export type DocumentSnapshot = firebase.firestore.DocumentSnapshot;
export type QuerySnapshot = firebase.firestore.QuerySnapshot;
export type QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
