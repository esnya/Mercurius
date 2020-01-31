import firebase from 'firebase/app';
import identity from 'lodash/identity';
import flow from 'lodash/flow';
import omit from 'lodash/omit';
import mapObject from 'map-obj';
import Ajv from 'ajv';
import { JSONSchema7 } from 'json-schema';

type DocumentData = firebase.firestore.DocumentData;
type FirestoreDataConverter<T> = firebase.firestore.FirestoreDataConverter<T>;

export function decode<T extends {}>(value: T): T {
  return mapObject(value, (key, value) => [
    key as string,
    value instanceof firebase.firestore.Timestamp
      ? value.toDate()
      : Array.isArray(value)
      ? value.map(decode)
      : value,
  ]) as T;
}

export function simpleConverter<T>(
  cast: (data: DocumentData) => T,
): FirestoreDataConverter<T> {
  return {
    fromFirestore: flow(
      (snapshot): DocumentData => snapshot.data(),
      decode,
      cast,
    ),
    toFirestore: identity,
  };
}

const ajv = new Ajv();

function assertValid<T>(
  validate: Ajv.ValidateFunction,
  value: unknown,
): asserts value is T {
  if (!validate(value)) {
    throw new Error(ajv.errorsText(validate.errors));
  }
}

export function schemaConverter<T extends {}>(
  schema: JSONSchema7,
): FirestoreDataConverter<T> {
  const validate = ajv.compile(schema);
  return {
    fromFirestore: flow(
      (snapshot): DocumentData => ({
        id: snapshot.id,
        ...snapshot.data(),
      }),
      decode,
      (data: DocumentData): T => {
        assertValid<T>(validate, data);
        return data;
      },
    ),
    toFirestore(data: T): DocumentData {
      return omit(data, 'id');
    },
  };
}
