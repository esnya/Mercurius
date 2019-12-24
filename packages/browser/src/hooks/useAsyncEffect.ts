/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';

export default function useAsyncEffect(
  effect: () => Promise<void | (() => void)>,
  dependsOn?: any[],
): void {
  useEffect(() => {
    const p = effect();

    return (): void => {
      p.then(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, dependsOn);
}
