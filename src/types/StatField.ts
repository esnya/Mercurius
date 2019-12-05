import PriceStats from './PriceStats';

export default interface StatField {
  path: keyof PriceStats;
  text: string;
  format: (value: number) => string;
  factor?: number;
  colorFactor?: number;
  textAlign?: 'right' | 'left' | 'center';
}
