import firebase from 'firebase/app';
import PriceStats, { isPriceStats } from './PriceStats';

export type TimeRange = 14;

type Timestamp = firebase.firestore.Timestamp;
const Timestamp = firebase.firestore.Timestamp;

export default interface Item {
  name: string;
  type: string;
  priceStats?: PriceStats;
  updatedAt?: Timestamp;
  backgroundChartUpdatedAt?: Timestamp;
  chartUpdatedAt?: Timestamp;
  dailyStats?: {
    [days: string]: {
      avg: number;
      opening: number;
      closing: number;
      rate?: number;
      roid?: number;
    };
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isItem(value: any): value is Item {
  return (
    typeof value === 'object' &&
    typeof value.name === 'string' &&
    typeof value.type === 'string' &&
    (!value.updatedAt ||
      value.updatedAt instanceof firebase.firestore.Timestamp) &&
    (!value.backgroundChartUpdatedAt ||
      value.backgroundChartUpdatedAt instanceof firebase.firestore.Timestamp) &&
    (!value.chartUpdatedAt ||
      value.chartUpdatedAt instanceof firebase.firestore.Timestamp) &&
    (!value.priceStats || isPriceStats(value.priceStats))
  );
}
