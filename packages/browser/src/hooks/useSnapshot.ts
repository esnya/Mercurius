import { useState } from 'react';
import useFirebase from './useFirebase';
import useAsyncEffect from './useAsyncEffect';
import { NonEmptySnapshot, Snapshot } from '../firebase/snapshot';
import { isSucceeded, isDefined, ValueOrGetter } from '../utilities/types';
import { DocumentData } from '../firebase';
import { decode } from '../firebase/snapshot';
import PromiseReader from '../suspense/PromiseReader';

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

export function useDocumentSnapshot<T, A extends unknown[]>(
  gerRef: (firestore: Firestore, ...args: A) => DocumentReference,
  read: (data: DocumentData) => T | null,
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
      data: (isExists(s) && read(decode(s.data()))) || undefined,
    });

    return ref.onSnapshot(next =>
      setSnapshot({
        ref,
        data: (isExists(next) && read(decode(next.data()))) || undefined,
      }),
    );
  }, [app, ...args]);

  return snapshot;
}

export function useQuerySnapshot<T>(
  initialize: (firestore: Firestore) => Query,
  read: (data: DocumentData) => T | null,
  dependsOn?: unknown[],
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

    return initialize(app.firestore()).onSnapshot((querySnapshot): void => {
      if (!isSucceeded(snapshots) || snapshots.length === 0) {
        setSnapshots(
          querySnapshot.docs
            .map(doc => {
              const data = read(decode(doc.data()));

              return data ? { ref: doc.ref, data } : null;
            })
            .filter(isDefined),
        );
      } else {
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
      }
    });
  }, [app, ...(dependsOn || [])]);

  return snapshots;
}
