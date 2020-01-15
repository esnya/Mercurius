import { Observable } from 'rxjs';
import memoize = require('lodash/memoize');

interface Reader<T> {
  read(): T;
}

export const toReader = memoize(
  <T>(observable: Observable<T>): Reader<T> => {
    const value: {
      result?: T;
      error?: Error;
    } = {};

    observable.subscribe({
      next: (next): void => {
        value.result = next;
      },
      error: (error): void => {
        value.error = error;
      },
    });

    return {
      read: (): T => {
        if (value.error) {
          throw value.error;
        }

        if (value.result === undefined) {
          throw observable.toPromise();
        }

        return value.result;
      },
    };
  },
);

export function read<T>(observable: Observable<T>): T {
  return toReader(observable).read();
}
