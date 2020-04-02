import { useState, useEffect } from 'react';
import { ObservableInput, from } from 'rxjs';

interface ObservableStateBase<State extends string> {
  state: State;
  completed?: boolean;
}
export type ObservableLoadingState = ObservableStateBase<'loading'>;
export interface ObservableFailedState<E extends Error>
  extends ObservableStateBase<'failed'> {
  error: E;
}
export interface ObservableSucceededState<T>
  extends ObservableStateBase<'succeeded'> {
  value: T;
}
export type ObservableState<T, E extends Error> =
  | ObservableLoadingState
  | ObservableFailedState<E>
  | ObservableSucceededState<T>;
export default function useObservable<T, E extends Error = Error>(
  init: () => ObservableInput<T>,
  dependsOn?: unknown[],
): ObservableState<T, E> {
  const [state, setState] = useState(
    (): ObservableState<T, E> => ({ state: 'loading' }),
  );

  useEffect((): (() => void) => {
    const observable = init();
    const subscription = from(observable).subscribe({
      next: (value: T): void => {
        setState({
          state: 'succeeded',
          value,
        });
      },
      error: (error: E): void => {
        setState({
          state: 'failed',
          error,
        });
      },
      complete: (): void => {
        setState(prev => ({
          ...prev,
          completed: true,
        }));
      },
    });

    return (): void => {
      subscription.unsubscribe();
    };
  }, dependsOn);

  return state;
}
