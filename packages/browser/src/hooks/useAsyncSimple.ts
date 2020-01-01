import { useAsync } from 'react-async-hook';

export default function useAsyncSimple<T>(
  promise: Promise<T> | (() => Promise<T>),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dependsOn?: any[],
): T | Error | undefined {
  const { result, error } = useAsync(
    typeof promise === 'function' ? promise : (): Promise<T> => promise,
    dependsOn ?? [],
  );

  if (error) return error;
  return result;
}
