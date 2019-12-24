export function isDefined<V>(value?: V | null): value is V {
  return value !== undefined && value !== null;
}
