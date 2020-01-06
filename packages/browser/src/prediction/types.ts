export interface NormalizedPrice {
  timestamp: number;
  price: number;
  lottery: number;
}

export interface PredictionResult {
  timestamp: Date;
  increase: number;
  flat: number;
  decrease: number;
  buy: number;
  sell: number;
}

export interface IncreasingOrDecreasing<T = boolean> {
  increasing: T;
  flat: T;
  decreasing: T;
  buy: T;
  sell: T;
}
