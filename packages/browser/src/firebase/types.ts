import firebase from 'firebase/app';

export const FieldValue = firebase.firestore.FieldValue;
export const Timestamp = firebase.firestore.Timestamp;

export type DocumentData = firebase.firestore.DocumentData;
export type FieldValue = firebase.firestore.FieldValue;
export type Timestamp = firebase.firestore.Timestamp;

export type CollectionReference<
  T = DocumentData
> = firebase.firestore.CollectionReference<T>;
export type DocumentReference<
  T = DocumentData
> = firebase.firestore.DocumentReference<T>;
export type DocumentSnapshot<
  T = DocumentData
> = firebase.firestore.DocumentSnapshot<T>;
export type Query<T = DocumentData> = firebase.firestore.Query<T>;
export type QueryDocumentSnapshot<
  T = DocumentData
> = firebase.firestore.QueryDocumentSnapshot<T>;
export type QuerySnapshot<T = DocumentData> = firebase.firestore.QuerySnapshot<
  T
>;
