import get from 'lodash/get';
import identity from 'lodash/identity';
import flow from 'lodash/flow';
import mapObject from 'map-obj';
import Ajv, { ErrorObject } from 'ajv';
import { JSONSchema7 } from 'json-schema';

export interface TimestampLike {
  toMillis(): number;
}
export function isTimestampLike(value: unknown): value is TimestampLike {
  if (typeof value !== 'object') return false;
  return typeof get(value, 'toMillis') === 'function';
}

type Decoded<T> = T extends TimestampLike ? number : T;

export function decodeValue<T>(value: T): Decoded<T> {
  if (isTimestampLike(value)) {
    return value.toMillis() as Decoded<T>;
  }
  return value as Decoded<T>;
}

export function decode<T extends {}>(value: T): T {
  return mapObject(value, (key, value) => [
    key as string,
    decodeValue(value),
  ]) as T;
}

export type DocumentData = Record<string, any>;

export interface QueryDocumentSnapshotLike<T = DocumentData> {
  data(): T;
}

export interface FirestoreDataConverterLike<T> {
  fromFirestore(snapshot: QueryDocumentSnapshotLike): T;
  toFirestore(data: T): DocumentData;
}

export function simpleConverter<T>(
  cast: (data: DocumentData) => T,
): FirestoreDataConverterLike<T> {
  return {
    fromFirestore: flow(
      (snapshot: QueryDocumentSnapshotLike): DocumentData => snapshot.data(),
      decode,
      cast,
    ),
    toFirestore: identity,
  };
}

const ajv = new Ajv();

class DataConverterError extends Error {
  constructor(readonly errors: ErrorObject[]) {
    super(ajv.errorsText(errors));
  }
}

export function schemaConverter<T>(
  schema: JSONSchema7,
  fallback?: (data: DocumentData, snapshot: QueryDocumentSnapshotLike) => T,
): FirestoreDataConverterLike<T> {
  const validate = ajv.compile(schema) as ((value: unknown) => value is T) & {
    errors: ErrorObject[];
  };

  return {
    fromFirestore(snapshot): T {
      const data = decode(snapshot.data());

      if (validate(data)) {
        return data;
      }

      if (fallback) {
        return fallback(data, snapshot);
      }

      throw new DataConverterError(validate.errors);
    },
    toFirestore: identity,
  };
}
