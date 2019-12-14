import PriceStats from './PriceStats';

export default interface StatField {
  path: string;
  text: string;
  format: (value: number) => string;
  factor?: number;
  colorFactor?: number;
  colorBias?: number;
  textAlign?: 'right' | 'left' | 'center';
}
