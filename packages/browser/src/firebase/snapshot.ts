import {
  DocumentReference,
  DocumentSnapshot,
  DocumentData,
  Timestamp,
} from './types';
import mapObject from 'map-obj';

export interface NonEmptySnapshot<T> extends Snapshot<T> {
  data: T;
}

export interface Snapshot<T> {
  ref: DocumentReference;
  data?: T;
}

export type QuerySnapshot<T> = NonEmptySnapshot<T>[];

export function isExists<T>(
  snapshot: Snapshot<T>,
): snapshot is NonEmptySnapshot<T> {
  return snapshot.data !== undefined;
}

export function decode(value: DocumentData): DocumentData {
  return mapObject(value, (key, value) => [
    key as string,
    value instanceof Timestamp ? value.toDate() : value,
  ]) as DocumentData;
}

export type Converter<T> = (value: unknown) => T;

export function cast<T>(
  snapshot: DocumentSnapshot,
  converter: Converter<T>,
  captureError = true,
): Snapshot<T> {
  const { ref } = snapshot;
  const data = snapshot.data();
  if (data === undefined) {
    return { ref };
  }

  try {
    return {
      ref,
      data: converter(decode(data)),
    };
  } catch (error) {
    if (!captureError) {
      throw error;
    }
    return { ref };
  }
}

export function castQuery<T>(
  snapshot: firebase.firestore.QuerySnapshot,
  converter: Converter<T>,
  captureError = true,
): NonEmptySnapshot<T>[] {
  return snapshot.docs
    .map(doc => cast(doc, converter, captureError))
    .filter(isExists);
}
