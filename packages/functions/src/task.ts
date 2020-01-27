import firebase from 'firebase-admin';

type DocumentData = firebase.firestore.DocumentData;
type DocumentReference<T = DocumentData> = firebase.firestore.DocumentReference<T>;
type DocumentSnapshot<T = DocumentData> = firebase.firestore.DocumentSnapshot<T>;

export function run(itemRefOrSnapshot: DocumentReference | DocumentSnapshot): Promise<void> {
  const itemSnapshot = 'data' in itemRefOrSnapshot ? itemRefOrSnapshot : await itemRefOrSnapshot.get();
  const item = itemSnapshot.data();
  if (!item) {
    console.log('Item does not exist');
    return;
  }

  const updatedAt = item.updatedAt;

  const pricesRef = itemSnapshot.ref.collection('prices');
  const lastPrice = pricesRef.orderBy('timestamp', 'desc').
}