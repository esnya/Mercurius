import { FieldDefinition } from 'mercurius-core/lib/models-next/FieldDefinition';
import { ArrayExpression } from 'mercurius-core/lib/models-next/Expression';

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
    value: {
      $cond: {
        if: '$data.indices',
        then: {
          $arrayElemAt: [
            {
              $map: {
                input: {
                  $filter: {
                    input: {
                      $map: {
                        input: '$data.indices',
                        as: 'index',
                        in: {
                          value: '$$index.purchase',
                          isFresh: { $gte: ['$$index.timestamp', '$now'] },
                        },
                      },
                    },
                    as: 'index',
                    cond: '$$index.isFresh',
                  },
                },
                as: 'index',
                in: '$$index.value',
              },
            } as ArrayExpression<number>,
            0,
          ],
        },
      },
    },
    format: 'percentage',
    textAlign: 'center',
    factor: 100,
    color: {},
  },
  {
    id: 'divestment',
    text: '売り指数',
    value: {
      $cond: {
        if: '$data.indices',
        then: {
          $arrayElemAt: [
            {
              $map: {
                input: {
                  $filter: {
                    input: {
                      $map: {
                        input: '$data.indices',
                        as: 'index',
                        in: {
                          value: '$$index.divestment',
                          isFresh: { $gte: ['$$index.timestamp', '$now'] },
                        },
                      },
                    },
                    as: 'index',
                    cond: '$$index.isFresh',
                  },
                },
                as: 'index',
                in: '$$index.value',
              },
            } as ArrayExpression<number>,
            0,
          ],
        },
      },
    },
    format: 'percentage',
    textAlign: 'center',
    factor: 100,
    color: {},
  },
  {
    id: 'roid0',
    text: '騰落率',
    value: {
      $divide: [
        { $subtract: ['$data.dailyStats.0.closing', '$data.dailyStats.1.avg'] },
        '$data.dailyStats.1.avg',
      ],
    },
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
    value: {
      $divide: [
        { $subtract: ['$data.dailyStats.1.avg', '$data.dailyStats.2.avg'] },
        '$data.dailyStats.2.avg',
      ],
    },
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
    id: 'closingPerMonthlyMin',
    text: '対安値騰落率',
    value: {
      $divide: [
        { $subtract: ['$data.priceStats.end', '$data.priceStats.min'] },
        '$data.priceStats.min',
      ],
    },
    format: 'percentage',
    textAlign: 'center',
    factor: 100,
    color: {},
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
