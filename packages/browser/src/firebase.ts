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

export const FieldValue = firebase.firestore.FieldValue;
export const Timestamp = firebase.firestore.Timestamp;
export type CollectionReference = firebase.firestore.CollectionReference;
export type DocumentData = firebase.firestore.DocumentData;
export type DocumentReference = firebase.firestore.DocumentReference;
export type DocumentSnapshot = firebase.firestore.DocumentSnapshot;
export type FieldValue = firebase.firestore.FieldValue;
export type Query = firebase.firestore.Query;
export type QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
export type QuerySnapshot = firebase.firestore.QuerySnapshot;
export type Timestamp = firebase.firestore.Timestamp;
