import 'source-map-support/register';

import firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import updateItem from './item';
import * as Luxon from 'luxon';

Luxon.Settings.defaultZoneName = 'Asia/Tokyo';

firebase.initializeApp();

const configured = functions.region('asia-northeast1').runWith({
  memory: '2GB',
});

export const onPriceChange = configured.firestore
  .document('projects/{projectId}/items/{itemId}/prices/{priceId}')
  .onWrite(
    async (change): Promise<void> => {
      const itemRef = change.after.ref.parent.parent;
      if (!itemRef) throw new Error('Failed to get Item');
      await updateItem(itemRef.path);
    },
  );

export const onItemChange = configured.firestore
  .document('projects/{projectId}/items/{itemId}')
  .onWrite(
    async (change): Promise<void> => {
      await updateItem(change.after.ref.path);
    },
  );
