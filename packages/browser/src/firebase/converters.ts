import firebase from 'firebase/app';
import identity from 'lodash/identity';
import flow from 'lodash/flow';
import omit from 'lodash/omit';
import mapObject from 'map-obj';
import Ajv from 'ajv';
import { JSONSchema7 } from 'json-schema';
import { QueryDocumentSnapshot } from './types';

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

export function decodeToMillis<T extends {}>(value: T): T {
  return mapObject(value, (key, value) => [
    key as string,
    value instanceof firebase.firestore.Timestamp
      ? value.toMillis()
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

export function schemaConverter<T extends {}>(
  schema: JSONSchema7,
  fallback?: (snapshot: QueryDocumentSnapshot<DocumentData>) => Omit<T, 'id'>,
): FirestoreDataConverter<T> {
  const validate = ajv.compile(
    mapObject(schema, ([key, value]) => [
      key,
      key === 'additionalProperties' ? false : value,
    ]),
  );
  return {
    fromFirestore(snapshot): T {
      const id = snapshot.id;
      const data = {
        ...decodeToMillis(snapshot.data()),
        id,
      };

      if (validate(data)) return (data as unknown) as T;

      if (fallback) {
        return ({
          ...fallback(snapshot),
          id,
        } as unknown) as T;
      }

      throw new Error(ajv.errorsText(validate.errors));
    },
    toFirestore(data: T): DocumentData {
      return omit(data, 'id');
    },
  };
}
