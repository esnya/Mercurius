import moment, { Moment } from 'moment';
import formatter from 'format-number';

export function formatTimestamp(value?: Moment | Date | number): string {
  return moment(value).format('Y/MM/DD HH:mm:ss');
}

export const formatNumber = formatter();
export const formatInteger = formatter({
  round: 0,
});
export const formatDecimal = formatter({
  round: 2,
  padRight: 2,
});
