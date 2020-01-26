import identity from 'lodash/identity';
import flow from 'lodash/flow';
import mapObject from 'map-obj';

export interface TimestampLike {
  toDate(): Date;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isTimestampLike(value: any): value is TimestampLike {
  return (
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  );
}

export function timestampToDate<T>(value: T | TimestampLike): T | Date {
  if (isTimestampLike(value)) {
    return value.toDate();
  }
  return value;
}

export function decode<T extends {}>(value: T): T {
  return mapObject(value, (key, value) => [
    key as string,
    timestampToDate(value),
  ]) as T;
}

export interface QueryDocumentSnapshotLike<U> {
  data(): U;
}

export interface FirestoreDataConverterLike<T, U> {
  fromFirestore(snapshot: QueryDocumentSnapshotLike<U>): T;
  toFirestore(data: T): U;
}

export function simpleConverter<T, U>(
  cast: (data: U) => T,
): FirestoreDataConverterLike<T, U> {
  return {
    fromFirestore: flow(
      (snapshot: QueryDocumentSnapshotLike<U>): U => snapshot.data(),
      decode,
      cast,
    ),
    toFirestore: identity,
  };
}
