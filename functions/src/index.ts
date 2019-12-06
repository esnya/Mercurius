import * as functions from 'firebase-functions';
import { updatePriceStats } from './priceStats';

export const onPriceChange = functions.firestore
  .document('projects/{projectId}/items/{itemId}/prices/{priceId}')
  .onWrite(
    async (change, _context): Promise<void> => {
      const priceSnapshot = change.after;
      const priceRef = priceSnapshot.ref;
      const itemRef = change.after.ref.parent.parent;
      if (itemRef) {
        await updatePriceStats(itemRef, { priceRef, priceSnapshot });
      }
    },
  );

export const onItemChange = functions.firestore
  .document('projects/{projectId}/items/{itemId}')
  .onWrite(
    async (change, _context): Promise<void> => {
      console.log(_context);
      await updatePriceStats(change.after.ref, { itemSnapshot: change.after });
    },
  );
