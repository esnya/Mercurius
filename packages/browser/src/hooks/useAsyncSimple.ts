import { useAsync } from 'react-async-hook';

export default function useAsyncSimple<T, A extends [] = []>(
  promise: Promise<T> | ((...args: A) => Promise<T>),
  args?: A,
): T | Error | undefined {
  const { result, error } = useAsync(
    typeof promise === 'function' ? promise : (): Promise<T> => promise,
    args ?? [],
  );

  if (error) return error;
  return result;
}
