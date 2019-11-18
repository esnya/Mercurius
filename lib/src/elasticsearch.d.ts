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
export declare type Bucket = Record<string, AggrigationValue> & {
    key: string;
    doc_count: number;
};
export interface Result {
    hits: Hits;
    aggregations: Record<string, {
        buckets: Bucket[];
    }>;
}
export declare function api<T>(index: string, path: string, options?: Omit<RequestInit, 'body'> & {
    body?: T;
}): Promise<Result>;
export declare function index<T>(index: string, body: T): Promise<Result>;
export declare function search<T>(index: string, body: T): Promise<Result>;
export declare function del(index: string, id: string): Promise<Result>;
