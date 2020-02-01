import firebase from 'firebase-admin';

export const Timestamp = firebase.firestore.Timestamp;
export type Timestamp = firebase.firestore.Timestamp;

export const FieldValue = firebase.firestore.FieldValue;
export type FieldValue = firebase.firestore.FieldValue;

export interface Price {
  timestamp: Timestamp;
  price: number;
  lottery: boolean;
}

export interface Indices {
  divestment: number;
  purchase: number;
}
