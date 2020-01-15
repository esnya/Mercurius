import firebase from 'firebase/app';
import identity from 'lodash/identity';
import flow from 'lodash/flow';
import mapObject from 'map-obj';

export function decode<T extends {}>(value: T): T {
  return mapObject(value, (key, value) => [
    key as string,
    value instanceof firebase.firestore.Timestamp ? value.toDate() : value,
  ]) as T;
}

export function simpleConverter<T, U>(
  cast: (data: U) => T,
): firebase.firestore.FirestoreDataConverter<T> {
  return {
    fromFirestore: flow(
      (snapshot: firebase.firestore.QueryDocumentSnapshot<U>): U =>
        snapshot.data(),
      decode,
      cast,
    ),
    toFirestore: identity,
  };
}
