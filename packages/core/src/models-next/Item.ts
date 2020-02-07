import Price from './Price';
import PriceIndex from './PriceIndex';

export interface ItemPriceStat {
  minMaxRate: number;
  min: number;
  max: number;
  fluctuationRate?: number;
  closing: Price;
}

export default interface Item {
  name: string;
  type?: string;

  updatedAt?: number;

  backgroundChartUrl?: string;
  chartUrl?: string;

  daily?: Record<string, ItemPriceStat>;
  last30Days?: ItemPriceStat;
  indices?: Record<string, PriceIndex>;
}
