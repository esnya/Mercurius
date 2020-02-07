/* eslint @typescript-eslint/no-explicit-any: off */

import pickBy from 'lodash/pickBy';
import mapObject from 'map-obj';
import Ajv, { ErrorObject } from 'ajv';
import { JSONSchema7 } from 'json-schema';
import {
  Timestamp,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  DocumentSnapshot,
  isTimestamp,
  FieldValueClass,
  serverTimestamp,
} from './types';

type Decoded<T> = T extends Timestamp ? number : T;

export function decodeValue<T>(value: T): Decoded<T> {
  if (isTimestamp(value)) {
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

export function encodeValue(
  value: any,
  key: string,
  fieldValueClass: FieldValueClass,
): any {
  if (value === serverTimestamp) return fieldValueClass.serverTimestamp();
  if (typeof value === 'number' && key.match(/timestamp|uUpdatedAt$/)) {
    return new Date(value);
  }
  if (typeof value === 'object') {
    return pickBy(value, v => v !== undefined);
  }
  return value;
}

export function encode<T extends {}>(
  value: T,
  fieldValueClass: FieldValueClass,
): DocumentData {
  return pickBy(
    mapObject(value, (key, value) => [
      key as string,
      encodeValue(value, key as string, fieldValueClass),
    ]),
    v => v !== undefined,
  );
}

const ajv = new Ajv();

export class DataConverterError extends Error {
  constructor(readonly errors: ErrorObject[]) {
    super(ajv.errorsText(errors));
  }
}

type Validator<T> = ((value: unknown) => value is T) & {
  errors: ErrorObject[];
};

export function schemaConverter<T>(
  schema: JSONSchema7,
  fieldValueClass: FieldValueClass,
  fallback?: (data: DocumentData, validate: Validator<T>) => T,
): FirestoreDataConverter<T> & { validate: Validator<T> } {
  const validate = ajv.compile(schema) as Validator<T>;

  return {
    fromFirestore(snapshotOrData): T {
      const data = decode(
        'data' in snapshotOrData && typeof snapshotOrData.data === 'function'
          ? snapshotOrData.data()
          : snapshotOrData,
      );

      if (validate(data)) {
        return data;
      }

      if (fallback) {
        return fallback(data, validate);
      }

      throw new DataConverterError(validate.errors);
    },
    toFirestore(data: T): DocumentData {
      return encode(data, fieldValueClass);
    },
    validate,
  };
}

export function isNotEmpty<T>(
  snapshot: DocumentSnapshot<T>,
): snapshot is QueryDocumentSnapshot<T> {
  const data = snapshot.data();
  return data !== undefined;
}

export function convertSnapshot<T, S extends DocumentSnapshot<DocumentData>>(
  snapshot: S,
  converter: FirestoreDataConverter<T>,
): DocumentSnapshot<T> {
  const data = isNotEmpty(snapshot)
    ? converter.fromFirestore(snapshot)
    : undefined;
  const parent = snapshot.ref.parent.withConverter(converter);
  return {
    ...snapshot,
    ref: parent.doc(snapshot.ref.id),
    data: (): T | undefined => data,
  };
}
