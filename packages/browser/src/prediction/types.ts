import { MinMax } from 'mercurius-core/lib/models/ModelMetadata';

export interface QuantizedPrice {
  timestamp: number;
  price: number;
  lottery: number;
}

export interface Stats {
  timestamp: MinMax;
  price: MinMax;
}
