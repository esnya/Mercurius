import { useState } from 'react';
import useFirebase from './useFirebase';
import useAsyncEffect from './useAsyncEffect';
import { NonEmptySnapshot, Snapshot } from '../firebase/snapshot';

type Firestore = firebase.firestore.Firestore;
type DocumentReference = firebase.firestore.DocumentReference;
type DocumentSnapshot = firebase.firestore.DocumentSnapshot;
type Query = firebase.firestore.Query;
type QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;

function splice<T, U = never>(
  array: T[] | U,
  start: number,
  deleteCount: number,
  ...items: T[]
): T[] | U {
  if (!Array.isArray(array)) return array;

  const next = [...array];

  next.splice(start, deleteCount, ...items);

  return next;
}

function isExists(
  snapshot: DocumentSnapshot,
): snapshot is QueryDocumentSnapshot {
  return snapshot.exists;
}

export function useDocumentSnapshot<T, A extends any[]>(
  gerRef: (firestore: Firestore, ...args: A) => DocumentReference,
  read: (snapshot: QueryDocumentSnapshot) => T | null,
  ...args: A
): Snapshot<T> | Error | undefined {
  const app = useFirebase();
  const [snapshot, setSnapshot] = useState<Snapshot<T> | Error>();

  useAsyncEffect(async (): Promise<void | (() => void)> => {
    if (!app) return;

    if (app instanceof Error) {
      setSnapshot(app);
      return;
    }

    const ref = gerRef(app.firestore(), ...args);
    const s = await ref.get();
    setSnapshot({
      ref,
      data: (isExists(s) && read(s)) || undefined,
    });

    return ref.onSnapshot(next =>
      setSnapshot({
        ref,
        data: (isExists(next) && read(next)) || undefined,
      }),
    );
  }, [app, ...args]);

  return snapshot;
}

export function useQuerySnapshot<T, A extends any[]>(
  initialize: (firestore: Firestore, ...args: A) => Query,
  read: (snapshot: QueryDocumentSnapshot) => T | null,
  ...args: A
): NonEmptySnapshot<T>[] | Error | undefined {
  const app = useFirebase();
  const [snapshots, setSnapshots] = useState<NonEmptySnapshot<T>[] | Error>();

  useAsyncEffect(async (): Promise<void | (() => void)> => {
    if (!app) return;

    if (app instanceof Error) {
      setSnapshots(app);
      return;
    }

    setSnapshots([]);

    return initialize(app.firestore(), ...args).onSnapshot(
      (querySnapshot): void => {
        querySnapshot
          .docChanges()
          .forEach(({ type, doc, newIndex, oldIndex }) => {
            if (type === 'removed') {
              setSnapshots((prev): typeof prev => splice(prev, oldIndex, 1));
              return;
            }

            const data = read(doc);
            if (!data) return;

            const snapshot = {
              ref: doc.ref,
              data,
            };
            switch (type) {
              case 'added':
                setSnapshots((prev): typeof prev =>
                  splice(prev, newIndex, 0, snapshot),
                );
                break;
              case 'modified':
                setSnapshots((prev): typeof prev =>
                  splice(splice(prev, oldIndex, 1), newIndex, 0, snapshot),
                );
                break;
            }
          });
      },
    );
  }, [app, ...args]);

  return snapshots;
}
