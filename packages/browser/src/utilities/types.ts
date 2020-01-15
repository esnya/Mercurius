export type Parameters<T> = T extends (...args: infer A) => unknown ? A : never;

export function isDefined<V>(value?: V | null): value is V {
  return value !== undefined && value !== null;
}

export function isSucceeded<T>(value?: T | Error | null): value is T {
  return isDefined(value) && !(value instanceof Error);
}

export function isFailed<T>(value?: T | Error | null): value is Error {
  return isDefined(value) && value instanceof Error;
}

export type Unsubscribe = () => void;

export type Getter<T> = () => T;
export type ValueOrGetter<T> = T & Getter<T>;
export function toGetter<T>(value: ValueOrGetter<T>): Getter<T> {
  return typeof value === 'function' ? value : (): T => value;
}
export function toValue<T>(value: ValueOrGetter<T>): T {
  return typeof value === 'function' ? value() : value;
}
