import { Duration, DateTime } from 'luxon';

export type DurationLike = Duration | string;

export function toDuration(duration: DurationLike): Duration {
  if (Duration.isDuration(duration)) {
    return duration;
  }
  return Duration.fromISO(duration);
}

export function getDomain([min, max]: [DurationLike, DurationLike]): [
  DateTime,
  DateTime,
] {
  const now = DateTime.local();
  return [now.minus(toDuration(min)), now.minus(toDuration(max))];
}

export function getSize(
  duration: DurationLike,
  timeUnit: DurationLike,
): number {
  return Math.floor(
    toDuration(duration).valueOf() / toDuration(timeUnit).valueOf(),
  );
}
