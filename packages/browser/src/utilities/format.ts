import moment, { Moment } from 'moment';
import formatter from 'format-number';
import { Timestamp } from '../firebase';

export function decodeTimestamp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any,
): Moment | Date | number | undefined {
  return value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
    ? value.toMillis()
    : value;
}

export function formatTimestamp(
  value?: Moment | Date | number | Timestamp,
): string {
  return moment(decodeTimestamp(value)).format('Y/MM/DD HH:mm:ss');
}
export function formatTimestampShort(
  value?: Moment | Date | number | Timestamp,
): string {
  return moment(decodeTimestamp(value)).format('MM/DD HH:mm');
}

export const formatNumber = formatter();
export const formatInteger = formatter({
  round: 0,
});
export const formatDecimal = formatter({
  round: 1,
  padRight: 1,
});
export const formatZeny = formatter({
  round: 0,
  suffix: ' \u24CF',
});
export const formatPercent = formatter({
  round: 1,
  padRight: 1,
  suffix: ' %',
});
