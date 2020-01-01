import { FilterDefinition } from 'mercurius-core/lib/models/FilterDefinition';

const filters: FilterDefinition[] = [
  {
    id: 'all',
    text: 'すべて',
    query: {},
  },
  {
    id: 'buy',
    text: '買い',
    query: {
      $or: [
        {
          'data.priceStats.roid': { $lt: 0.1 },
          'data.roid0': { $gt: 0 },
        },
        {
          'data.priceStats.roid': 0,
          'data.roid0': { $gt: -0.1 },
        },
      ],
    },
  },
  {
    id: 'sell',
    text: '売り',
    query: {
      $or: [
        {
          'data.priceStats.roid': { $gt: 0.4 },
          'data.roid0': { $gt: -0.1 },
        },
        {
          'data.priceStats.roid': { $gt: 0.1 },
          'data.roid0': { $gt: 0.1 },
          'data.roid1': { $gt: 0.1 },
        },
      ],
    },
  },
];
export default filters;

export function getFilter(id: string): FilterDefinition {
  return filters.find(f => f.id === id) ?? filters[0];
}
