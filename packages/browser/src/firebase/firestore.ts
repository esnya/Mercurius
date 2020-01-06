import { DocumentReference, CollectionReference } from './types';
import { initializeApp } from '.';

export async function initializeFirestore(
  name?: string,
): Promise<firebase.firestore.Firestore> {
  const app = await initializeApp(name);
  return app.firestore();
}

export async function doc(path: string): Promise<DocumentReference> {
  const firestore = await initializeFirestore();
  return firestore.doc(path);
}

export async function collection(path: string): Promise<CollectionReference> {
  const firestore = await initializeFirestore();
  return firestore.collection(path);
}
