import { DateTime, Duration } from 'luxon';

const timeUnit = Duration.fromISO('PT3H');

export const timestampGetters = {
  now(now: DateTime): DateTime {
    return now;
  },
  today(now: DateTime): DateTime {
    return now.startOf('day');
  },
  yesterday(now: DateTime): DateTime {
    return now.minus(Duration.fromISO('P1D')).startOf('day');
  },
  currentMonth(now: DateTime): DateTime {
    return now.startOf('month');
  },
  last30Days(now: DateTime): DateTime {
    return now.minus(Duration.fromISO('P30D'));
  },
  nextTimeUnit(now: DateTime): DateTime {
    return DateTime.fromMillis(
      Math.floor(now.plus(timeUnit).valueOf() / timeUnit.valueOf()) *
        timeUnit.valueOf(),
    );
  },
};

export function replaceTimestamps(path: string, now?: DateTime): string {
  return path.replace(/%[^%]+?%/g, (matched): string => {
    const name = matched.substr(1, matched.length - 2);
    const getter = (timestampGetters as Record<
      string,
      (now: DateTime) => DateTime
    >)[name];
    if (!getter) return matched;

    return `${getter(now ?? DateTime.local()).toMillis()}`;
  });
}
