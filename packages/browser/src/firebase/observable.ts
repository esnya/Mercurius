import { Observable } from 'rxjs';
import { Unsubscribe } from 'firebase';
import { QueryDocumentSnapshot, Query } from './types';

export function fromQuery<T>(
  query: Query<T>,
): Observable<QueryDocumentSnapshot<T>[]> {
  let docs: QueryDocumentSnapshot<T>[] | null = null;

  return new Observable(
    (subject): Unsubscribe => {
      return query.onSnapshot(
        (snapshot): void => {
          if (docs) {
            snapshot
              .docChanges()
              .forEach(({ newIndex, oldIndex, doc }): void => {
                if (docs && oldIndex >= 0) {
                  docs = docs.splice(oldIndex, 1);
                }

                if (docs && newIndex >= 0) {
                  docs = docs.splice(newIndex, 0, doc);
                }
              });
          } else {
            docs = snapshot.docs;
          }

          subject.next(docs);
        },
        error => subject.error(error),
        () => subject.complete(),
      );
    },
  );
}
