import { isDefined } from './types';
import { Truthy } from 'lodash';

export function assert<T>(
  value: T,
  message?: string,
): asserts value is Truthy<T> {
  if (!value) {
    throw new Error(
      `Assertion failed: ${message ?? `${value} is not truthy)`}`,
    );
  }
}

export function assertIsDefined<T>(
  value: T | null | undefined,
): asserts value is T {
  assert(isDefined(value), `${value} is not defined`);
}
