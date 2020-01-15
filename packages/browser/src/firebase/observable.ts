import { Observable } from 'rxjs';
import { Unsubscribe } from 'firebase';

export function fromQuery<T>(
  query: firebase.firestore.Query<T>,
): Observable<firebase.firestore.QuerySnapshot<T>> {
  return new Observable(
    (subject): Unsubscribe => {
      return query.onSnapshot(subject);
    },
  );
}
