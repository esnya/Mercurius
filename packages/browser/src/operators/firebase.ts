import { initializeApp } from '../firebase';
import 'firebase/app';
import { OperatorFunction, Observable, from } from 'rxjs';
import { flatMap, skipWhile, map } from 'rxjs/operators';
import { schemaConverter } from '../firebase/converters';
import { JSONSchema7 } from 'mercurius-core/node_modules/@types/json-schema';

export const firebase$ = from(initializeApp());
export function currentUser(): OperatorFunction<
  firebase.app.App,
  firebase.User | null
> {
  return flatMap(
    (app: firebase.app.App): Observable<firebase.User | null> => {
      return new Observable<firebase.User | null>(
        (subscription): (() => void) => {
          return app.auth().onAuthStateChanged(subscription);
        },
      );
    },
  );
}

export const currentUser$ = firebase$.pipe(currentUser());
export const loggedIn$ = currentUser$.pipe(skipWhile(user => user === null));

export function waitUntilSignedIn<T>(): OperatorFunction<T, T> {
  return flatMap(value => loggedIn$.pipe(map(() => value)));
}

export type CollectionParent =
  | firebase.firestore.Firestore
  | firebase.firestore.DocumentReference;
export function collection<T>(
  path: string,
  schema: JSONSchema7,
): OperatorFunction<
  CollectionParent,
  firebase.firestore.CollectionReference<T>
> {
  return map((parent: CollectionParent) =>
    parent.collection(path).withConverter(schemaConverter<T>(schema)),
  );
}

export type DocumentParent =
  | firebase.firestore.Firestore
  | firebase.firestore.CollectionReference;
export function doc<T>(
  path: string,
  schema: JSONSchema7,
): OperatorFunction<DocumentParent, firebase.firestore.DocumentReference<T>> {
  return map((parent: DocumentParent) =>
    parent.doc(path).withConverter(schemaConverter<T>(schema)),
  );
}

export function querySnapshot<T>(): OperatorFunction<
  firebase.firestore.Query<T>,
  firebase.firestore.QuerySnapshot<T>
> {
  return flatMap(
    (query: firebase.firestore.Query<T>) =>
      new Observable<firebase.firestore.QuerySnapshot<T>>(subscription =>
        query.onSnapshot(subscription),
      ),
  );
}
