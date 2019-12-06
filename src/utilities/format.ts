import moment, { Moment } from 'moment';
import formatter from 'format-number';

export function formatTimestamp(value?: Moment | Date | number): string {
  return moment(value).format('Y/MM/DD HH:mm:ss');
}
export function formatTimestampShort(value?: Moment | Date | number): string {
  return moment(value).format('MM/DD HH:mm');
}

export const formatNumber = formatter();
export const formatInteger = formatter({
  round: 0,
});
export const formatDecimal = formatter({
  round: 2,
  padRight: 2,
});
export const formatZeny = formatter({
  round: 0,
  suffix: ' Zeny',
});
export const formatPercent = formatter({
  round: 2,
  padRight: 2,
  suffix: ' %',
});
