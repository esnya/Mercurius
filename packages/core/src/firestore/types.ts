import get from 'lodash/get';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type DocumentData = { [field: string]: any };
export type UpdateData = { [fieldPath: string]: any };

export interface FirestoreDataConverter<T> {
  toFirestore(modelObject: T): DocumentData;
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): T;
}

export interface Firestore {
  collection(collectionPath: string): CollectionReference<DocumentData>;
  doc(documentPath: string): DocumentReference<DocumentData>;
  listCollections(): Promise<Array<CollectionReference<DocumentData>>>;
}

export interface DocumentReference<T = DocumentData> {
  readonly id: string;
  readonly firestore: Firestore;
  readonly parent: CollectionReference<T>;
  readonly path: string;

  collection(collectionPath: string): CollectionReference<DocumentData>;
  listCollections(): Promise<Array<CollectionReference<DocumentData>>>;
  set(data: T): Promise<any>;
  update(data: UpdateData): Promise<any>;
  delete(): Promise<any>;
  get(): Promise<DocumentSnapshot<T>>;
  onSnapshot(
    onNext: (snapshot: DocumentSnapshot<T>) => void,
    onError?: (error: Error) => void,
  ): () => void;
  withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U>;
}

export interface DocumentSnapshot<T = DocumentData> {
  readonly exists: boolean;
  readonly ref: DocumentReference<T>;
  readonly id: string;
  data(): T | undefined;
}

export interface QueryDocumentSnapshot<T = DocumentData>
  extends DocumentSnapshot<T> {
  data(): T;
}

export interface CollectionReference<T = DocumentData> extends Query<T> {
  readonly id: string;
  readonly parent: DocumentReference<DocumentData> | null;
  readonly path: string;

  doc(path: string): DocumentReference<T>;
  add(data: T): Promise<DocumentReference<T>>;
  withConverter<U>(
    converter: FirestoreDataConverter<U>,
  ): CollectionReference<U>;
}

export type OrderByDirection = 'desc' | 'asc';
export type WhereFilterOp =
  | '<'
  | '<='
  | '=='
  | '>='
  | '>'
  | 'array-contains'
  | 'in'
  | 'array-contains-any';

export interface Query<T = DocumentData> {
  readonly firestore: Firestore;

  where(fieldPath: string, opStr: WhereFilterOp, value: any): Query<T>;
  orderBy(fieldPath: string, directionStr?: OrderByDirection): Query<T>;
  limit(limit: number): Query<T>;
  offset(offset: number): Query<T>;
  select(...field: string[]): Query<T>;
  startAt(...fieldValues: any[]): Query<T>;
  startAfter(snapshot: DocumentSnapshot<any>): Query<T>;
  startAfter(...fieldValues: any[]): Query<T>;
  endBefore(snapshot: DocumentSnapshot<any>): Query<T>;
  endBefore(...fieldValues: any[]): Query<T>;
  endAt(snapshot: DocumentSnapshot<any>): Query<T>;
  endAt(...fieldValues: any[]): Query<T>;
  get(): Promise<QuerySnapshot<T>>;
  onSnapshot(
    onNext: (snapshot: QuerySnapshot<T>) => void,
    onError?: (error: Error) => void,
  ): () => void;
  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U>;
}

export interface QuerySnapshot<T = DocumentData> {
  readonly docs: Array<QueryDocumentSnapshot<T>>;
}

// DocumentChangeType
// DocumentChange

export interface CollectionReference<T = DocumentData> extends Query<T> {
  readonly id: string;
  readonly parent: DocumentReference<DocumentData> | null;
  readonly path: string;

  doc(documentPath: string): DocumentReference<T>;
  add(data: T): Promise<DocumentReference<T>>;
  withConverter<U>(
    converter: FirestoreDataConverter<U>,
  ): CollectionReference<U>;
}

export type FieldValue = any;

export interface FieldValueClass {
  serverTimestamp(): FieldValue;
  delete(): FieldValue;
  increment(n: number): FieldValue;
  arrayUnion(...elements: any[]): FieldValue;
  arrayRemove(...elements: any[]): FieldValue;
}

export interface Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}
export function isTimestamp(value: unknown): value is Timestamp {
  if (typeof value !== 'object') return false;
  return typeof get(value, 'toMillis') === 'function';
}

export const serverTimestamp = Symbol('serverTimestamp');
