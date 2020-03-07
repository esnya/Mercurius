import { Observable } from 'rxjs';

export interface NonEmptyDocumentModel<T> extends FirestoreDocumentModel<T> {
  data: T;
}

export default class FirestoreDocumentModel<T> {
  readonly unsubscribe: firebase.Unsubscribe;

  readonly promise: Promise<this>;

  constructor(readonly ref: firebase.firestore.DocumentReference<T>) {
    let r: (value: this) => void;

    this.promise = new Promise((resolve): void => {
      r = resolve;
    });

    this.unsubscribe = ref.onSnapshot(
      (snapshot): void => {
        this.snapshot = snapshot;
        r(this);
      },
      error => console.error(error),
    );
  }

  private snapshot?: firebase.firestore.DocumentSnapshot<T>;

  isExists(): this is NonEmptyDocumentModel<T> {
    return this.data !== undefined;
  }

  get loading(): boolean {
    return this.snapshot === undefined;
  }

  get data(): T | undefined {
    return this.snapshot?.data();
  }

  get readExact(): NonEmptyDocumentModel<T> {
    if (this.loading) {
      throw this.promise;
    }

    if (!this.isExists()) {
      throw new Error(`${this.ref.path} does not exists.`);
    }

    return this;
  }
}
