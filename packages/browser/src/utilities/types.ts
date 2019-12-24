export function isDefined<V>(value?: V | null): value is V {
  return value !== undefined && value !== null;
}

export function isSucceeded<T>(value?: T | Error | null): value is T {
  return isDefined(value) && !(value instanceof Error);
}

export function isFailed<T>(value?: T | Error | null): value is Error {
  return isDefined(value) && value instanceof Error;
}
