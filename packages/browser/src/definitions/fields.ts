import {
  FieldDefinition,
  Format,
  TextAlign,
} from 'mercurius-core/lib/models/FieldDefinition';
import { formatInteger, formatPercent } from '../utilities/format';

const fields: FieldDefinition[] = [
  {
    id: 'price',
    text: '価格',
    value: '$data.dailyStats.0.closing',
    format: Format.Integer,
    textAlign: TextAlign.Right,
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
    format: Format.Percentage,
    textAlign: TextAlign.Center,
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
    format: Format.Percentage,
    textAlign: TextAlign.Center,
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
    format: Format.Integer,
    textAlign: TextAlign.Right,
  },
  {
    id: 'monthlyMax',
    text: '月間最高値',
    value: '$data.priceStats.max',
    format: Format.Integer,
    textAlign: TextAlign.Right,
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
    format: Format.Percentage,
    textAlign: TextAlign.Center,
    factor: 100,
    color: {},
  },
  {
    id: 'monthlyRoid',
    text: '月間騰落率',
    value: '$data.priceStats.fluctuationRate',
    format: Format.Percentage,
    textAlign: TextAlign.Center,
    factor: 100,
    color: {
      factor: 0.1,
    },
  },
];
export default fields;

export interface Field extends Omit<FieldDefinition, 'format'> {
  format: (value: number) => string;
  factor: number;
  textAlign: TextAlign;
  color?: {
    factor: number;
    minus: boolean;
  };
}

export function getField(id: string): Field | undefined {
  const found = fields.find(f => f.id === id);
  if (!found) return;

  const { format, factor, textAlign, color, ...field } = found;

  return {
    ...field,
    format:
      format === Format.Integer
        ? formatInteger
        : format === Format.Percentage
        ? formatPercent
        : (a): string => `${a}`,
    factor: factor ?? 1,
    textAlign: textAlign ?? TextAlign.Left,
    color: color && {
      factor: 1,
      minus: false,
      ...color,
    },
  };
}
