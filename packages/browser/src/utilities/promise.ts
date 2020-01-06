type Unpack<T> = T extends Promise<infer U>
  ? U
  : T extends {}
  ? { [K in keyof T]: Unpack<T[K]> }
  : T;

export function all<T extends Promise<unknown>[]>(...promises: T): Unpack<T> {
  return Promise.all(promises) as Unpack<T>;
}
