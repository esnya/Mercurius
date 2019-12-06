import firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import { updatePriceStats } from './priceStats';

const app = firebase.initializeApp();
const storage = app.storage();

export const onPriceChange = functions.firestore
  .document('projects/{projectId}/items/{itemId}/prices/{priceId}')
  .onWrite(
    async (change): Promise<void> => {
      const priceSnapshot = change.after;
      const priceRef = priceSnapshot.ref;
      const itemRef = change.after.ref.parent.parent;
      if (!itemRef) return;
      await updatePriceStats(itemRef, { priceRef, priceSnapshot, storage });
    },
  );

export const onItemChange = functions.firestore
  .document('projects/{projectId}/items/{itemId}')
  .onWrite(
    async (change): Promise<void> => {
      const itemSnapshot = change.after;
      const itemRef = itemSnapshot.ref;
      await updatePriceStats(itemRef, { itemSnapshot, storage });
    },
  );
