import { Observable } from 'rxjs';
import { Unsubscribe } from 'firebase';
import { QueryDocumentSnapshot, Query } from './types';

export function fromQuery<T>(
  query: Query<T>,
): Observable<QueryDocumentSnapshot<T>[]> {
  const docs: (QueryDocumentSnapshot<T> | null)[] = [];

  return new Observable(
    (subject): Unsubscribe => {
      return query.onSnapshot(
        (snapshot): void => {
          snapshot
            .docChanges()
            .forEach(({ type, newIndex, oldIndex, doc }): void => {
              switch (type) {
                case 'modified':
                case 'removed':
                  docs[oldIndex] = null;
                  break;
              }

              switch (type) {
                case 'added':
                case 'modified':
                  docs[newIndex] = doc;
                  break;
              }
            });

          subject.next(
            docs.filter((d): d is QueryDocumentSnapshot<T> => d !== null),
          );
        },
        error => subject.error(error),
        () => subject.complete(),
      );
    },
  );
}
