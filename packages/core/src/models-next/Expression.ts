/* eslint-disable @typescript-eslint/no-explicit-any */
export type ReferenceExpression<T> = string;

export type NumericExpression =
  | Partial<{
      $abs: NumericExpression;
      $ceil: NumericExpression;
      $exp: NumericExpression;
      $ln: NumericExpression;
      $log10: NumericExpression;
      $sqrt: NumericExpression;
      $add: NumericExpression[];
      $multiply: [NumericExpression, NumericExpression];
      $divide: [NumericExpression, NumericExpression];
      $log: [NumericExpression, NumericExpression];
      $mod: [NumericExpression, NumericExpression];
      $pow: [NumericExpression, NumericExpression];
      $round: [NumericExpression, NumericExpression];
      $subtract: [NumericExpression, NumericExpression];
      $trunc: [NumericExpression, NumericExpression];
      $cmp: [Expression, Expression];
    }>
  | number
  | ReferenceExpression<number>;

export type BooleanExpression =
  | Partial<{
      $and: BooleanExpression[];
      $not: BooleanExpression[];
      $or: BooleanExpression[];

      $eq: [Expression, Expression];
      $gt: [Expression, Expression];
      $gte: [Expression, Expression];
      $lt: [Expression, Expression];
      $lte: [Expression, Expression];
      $ne: [Expression, Expression];
    }>
  | boolean
  | ReferenceExpression<boolean>;

export type ArrayExpression<T> =
  | Partial<{
      $map: {
        input: ArrayExpression<any>;
        as: string;
        in: Expression<T>;
      };
      $filter: {
        input: ArrayExpression<T>;
        as: string;
        cond: BooleanExpression;
      };
    }>
  | T[]
  | ReferenceExpression<T[]>;

export type ExpressionOf<T> = T extends number
  ? NumericExpression
  : T extends boolean
  ? BooleanExpression
  : T extends unknown[]
  ? ArrayExpression<T[0]>
  : never;
export type GenericExpression<T> =
  | Partial<{
      $arrayElemAt: [ArrayExpression<T>, NumericExpression];
      $cond:
        | [BooleanExpression, Expression<T>, Expression<T>]
        | {
            if: BooleanExpression;
            then?: Expression<T>;
            else?: Expression<T>;
          };
      $ifNull: [Expression<T | null>, Expression<T>];
      $switch: {
        branches: {
          case: BooleanExpression;
          then: Expression<T>;
        }[];
        default?: Expression<T>;
      };
    }>
  | ReferenceExpression<T>;

export type Expression<T = any> = GenericExpression<T> | ExpressionOf<T>;
