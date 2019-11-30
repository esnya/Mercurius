const esMatch = location.search.match(/es=([^&]+)/);

const node = esMatch
  ? decodeURIComponent(esMatch[1])
  : `http://${location.hostname}:9200`;

export type Scalar = null | boolean | number | string;

export interface MatchAllQuery {
  match_all: {};
}

export interface MatchQuery {
  match: Record<string, Scalar>;
}
export interface RangeQuery {
  range: Record<
    string,
    {
      lt?: Scalar;
      gt?: Scalar;
      lte?: Scalar;
      gte?: Scalar;
    }
  >;
}

export interface BooleanQuery {
  bool: {
    should?: Query[];
  };
}

export type Query = MatchAllQuery | MatchQuery | RangeQuery | BooleanQuery;

export type Order = 'asc' | 'desc';

export interface TermsAggregation {
  terms: {
    field: string;
    size?: number;
    order?: Record<string, string>;
  };
}

export interface DateHistogramAggregation {
  date_histogram: {
    field: string;
    calendar_interval: string;
  };
}

export interface DerivativeAggregation {
  derivative: {
    buckets_path: string;
  };
}

export interface ValueAggregation {
  [key: string]: {
    field: string;
  };
}

export type Aggregation = (
  | TermsAggregation
  | ValueAggregation
  | DateHistogramAggregation
  | DerivativeAggregation
) & {
  aggs?: Record<string, Aggregation>;
};

export type Sort = Record<string, { order: Order }>;

export interface SearchBody {
  size?: number;
  query?: Query;
  sort?: Sort[];
  aggs?: Record<string, Aggregation>;
}

export interface Hit<T> {
  _id: string;
  _index: string;
  _source: T;
}

export interface Hits<T> {
  hits: Hit<T>[];
}

export interface AggregationValue {
  value: number;
  value_as_string: string;
}

export interface ExtendedStatsValue {
  avg: number;
  count: number;
  max: number;
  min: number;
  std_deviation_bounds: {
    lower: number;
    upper: number;
  };
  std_deviation: number;
  sum: number;
  variance: number;
}

export type Bucket = Record<
  string,
  AggregationValue & ExtendedStatsValue & { buckets: Bucket[] }
> & {
  key: string;
  key_as_string: string;
  doc_count: number;
};

export interface Result<T> {
  hits: Hits<T>;
  aggregations: Record<
    string,
    {
      buckets: Bucket[];
    } & AggregationValue &
      ExtendedStatsValue
  >;
}

export async function api<U = {}, T = never>(
  index: string,
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: T } = {},
): Promise<Result<U>> {
  const res = await fetch(`${node}/${index}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json();
  const { error } = json;
  if (error) {
    console.error(error);
    throw new Error(error.reason);
  }

  return json;
}

export async function index<T, U = {}>(
  index: string,
  value: T,
): Promise<Result<U>> {
  return await api(index, '_doc', { body: value });
}

export async function search<T = {}>(
  index: string,
  body: SearchBody,
): Promise<Result<T>> {
  return await api(index, '_search', { body });
}

export async function del<T = {}>(
  index: string,
  id: string,
): Promise<Result<T>> {
  return await api(index, `_doc/${id}`, { method: 'DELETE' });
}
