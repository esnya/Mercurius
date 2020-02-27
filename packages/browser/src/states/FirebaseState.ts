import firebase from 'firebase/app';

import 'firebase/analytics';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/storage';
import PromiseReader from '../suspense/PromiseReader';
import { initializeApp } from '../firebase';

export default class FirebaseState {
  constructor(readonly app: firebase.app.App) {}

  readonly auth = this.app.auth();
  readonly firestore = this.app.firestore();
  readonly storage = this.app.storage();
}

export const firebase$ = initializeApp().then(app => new FirebaseState(app));
export const firebaseReader = new PromiseReader(() => firebase$);
