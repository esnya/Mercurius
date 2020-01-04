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

export function cast<T>(
  snapshot: DocumentSnapshot,
  converter: (value: unknown) => T,
): Snapshot<T> {
  const data = snapshot.data();

  return {
    ...snapshot,
    data: data !== undefined ? converter(decode(data)) : undefined,
  };
}
