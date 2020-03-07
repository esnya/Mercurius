import Item from 'mercurius-core/lib/models-next/Item';

export default class Item$ {
  readonly unsubscribe: firebase.Unsubscribe;
  constructor(readonly ref: firebase.firestore.DocumentReference<Item>) {
    this.unsubscribe = ref.onSnapshot((snapshot): void => {
      console.log(snapshot);
      this.snapshot = snapshot;
    });
  }

  snapshot?: firebase.firestore.DocumentSnapshot<Item>;

  get data(): Item | undefined {
    return this.snapshot?.data();
  }
}
