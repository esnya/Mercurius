import FieldDefinition from 'mercurius-core/lib/models-next/FieldDefinition';

const fields: FieldDefinition[] = [
  {
    id: 'price',
    text: '価格',
    value: '$data.dailyStats.0.closing',
    format: 'integer',
    textAlign: 'right',
  },
  {
    id: 'purchase',
    text: '買い指数',
    value: '$data.indices.%now%.purchase',
    format: 'percentage',
    textAlign: 'center',
    factor: 100,
    color: {},
  },
  {
    id: 'divestment',
    text: '売り指数',
    value: '$data.indices.%now%.purchase',
    format: 'percentage',
    textAlign: 'center',
    factor: 100,
    color: {},
  },
  {
    id: 'roid0',
    text: '騰落率',
    value: '$data.rate.fluctuationRates.%today%',
    format: 'percentage',
    textAlign: 'center',
    factor: 100,
    color: {
      factor: 1 / 0.2 / 2,
      minus: true,
    },
  },
  {
    id: 'roid1',
    text: '前日騰落率',
    value: '$data.rate.fluctuationRates.%yesterday%',
    format: 'percentage',
    textAlign: 'center',
    factor: 100,
    color: {
      factor: 1 / 0.2 / 2,
      minus: true,
    },
  },
  {
    id: 'monthlyMin',
    text: '月間最安値',
    value: '$data.priceStats.min',
    format: 'integer',
    textAlign: 'right',
  },
  {
    id: 'monthlyMax',
    text: '月間最高値',
    value: '$data.priceStats.max',
    format: 'integer',
    textAlign: 'right',
  },
  {
    id: 'monthlyRoid',
    text: '月間騰落率',
    value: '$data.priceStats.fluctuationRate',
    format: 'percentage',
    textAlign: 'center',
    factor: 100,
    color: {
      factor: 0.1,
    },
  },
];
export default fields;
