import { DocumentReference } from "./types";

export interface NonEmptySnapshot<T> extends Snapshot<T> {
  data: T;
}

export interface Snapshot<T> {
  ref: DocumentReference;
  data?: T;
}

export function isExists<T>(snapshot: Snapshot<T>): snapshot is NonEmptySnapshot<T> {
  return snapshot.data !== undefined;
}
