const node = 'http://localhost:9200';

export interface Hits {
  hits: Record<string, any>[];
}

export interface Bucket {
  key: string;
  doc_count: number;
}

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
  body: T,
): Promise<any> {
  const res = await fetch(`${node}/${index}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  const { error } = json;
  if (error) {
    console.error(error);
    throw new Error(error.reason);
  }

  return json;
}

export async function index<T>(index: string, body: T): Promise<any> {
  return await api(index, '_doc', body);
}

export async function search<T>(index: string, body: T): Promise<any> {
  return await api(index, '_search', body);
}
