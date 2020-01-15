import { Observable } from 'rxjs';
import { Unsubscribe } from '../utilities/types';
import { useState, useEffect, useMemo } from 'react';

export default function useObservable<T>(
  observable: () => Observable<T>,
  dependsOn?: unknown[],
): T | undefined {
  const [value, setValue] = useState<T>();
  const [error, setError] = useState<Error>();

  useEffect((): Unsubscribe => {
    const s = observable().subscribe({
      next: setValue,
      error: setError,
    });
    return (): void => s.unsubscribe();
  }, dependsOn ?? [observable]);

  if (error) {
    throw error;
  }

  return value;
}
