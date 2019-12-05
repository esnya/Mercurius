import { useState, useEffect } from 'react';

export interface SucceededPromiseState<T, E> extends PromiseState<T, E> {
  readonly result: T;
  readonly error?: never;
}

export interface FailedPromiseState<T, E> extends PromiseState<T, E> {
  readonly result?: never;
  readonly error: E;
}

export interface PromiseState<T, E> {
  readonly promise: Promise<T>;
  readonly started: boolean;
  readonly pending: boolean;
  readonly error?: E;
  readonly result?: T;

  isSucceeded(): this is SucceededPromiseState<T, E>;
  isFailed(): this is FailedPromiseState<T, E>;
}

export default function usePromiseState<T, E = Error>(
  promise: Promise<T>,
): PromiseState<T, E> {
  const [state, set] = useState<PromiseState<T, E>>({
    promise,
    started: false,
    pending: true,
    isSucceeded: () => false,
    isFailed: () => false,
  });

  useEffect((): void => {
    if (promise === state.promise && state.started) return;

    set({
      ...state,
      started: true,
    });

    promise
      .then(
        (result: T): SucceededPromiseState<T, E> => ({
          promise: promise,
          pending: false,
          started: true,
          result: result,
          isSucceeded: (): boolean => true,
          isFailed: (): boolean => false,
        }),
        (error: E): FailedPromiseState<T, E> => ({
          promise: promise,
          pending: false,
          started: true,
          error: error,
          isSucceeded: (): boolean => false,
          isFailed: (): boolean => true,
        }),
      )
      .then(newState => set(newState));
  });

  return state;
}
