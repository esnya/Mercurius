import { Duration } from 'luxon';
export { default as DefaultModelConfiguration } from './DefaultModelConfiguration.yml';

export const timeStep = Duration.fromISO('PT1H').valueOf();

export interface Stats {
  timestamp: number[];
  price: number[];
}

export interface NormalizedPrice {
  timestamp: number;
  price: number;
  lottery: number;
}
