const node = `http://${location.hostname}:9200`;

export interface Hit {
  _id: string;
  _index: string;
  _source: Record<string, any>;
}

export interface Hits {
  hits: Record<string, any>[];
}

export interface AggrigationValue {
  value: number;
  value_as_string: string;
}

export type Bucket = Record<string, AggrigationValue> & {
  key: string;
  doc_count: number;
};

export interface Result {
  hits: Hits;
  aggregations: Record<
    string,
    {
      buckets: Bucket[];
    }
  >;
}

export async function api<T>(
  index: string,
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: T } = {},
): Promise<Result> {
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

export async function index<T>(index: string, body: T): Promise<Result> {
  return await api(index, '_doc', { body });
}

export async function search<T>(index: string, body: T): Promise<Result> {
  return await api(index, '_search', { body });
}

export async function del(index: string, id: string): Promise<Result> {
  return await api(index, `_doc/${id}`, { method: 'DELETE' });
}
