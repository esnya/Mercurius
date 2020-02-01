import firebase from 'firebase-admin';
import { DateTime, Duration } from 'luxon';
import mapValues from 'lodash/mapValues';
import pickBy from 'lodash/pickBy';
import { Price } from './types';
import predictIndices from './indices';
import { statPrices } from './stats';
import renderAllCharts from './chart';

function filterUndefined<T extends {}>(
  value: T,
): firebase.firestore.DocumentData {
  return mapValues(
    pickBy(value, a => a !== undefined),
    a =>
      typeof a === 'object' && a?.constructor === Object
        ? filterUndefined(a)
        : a,
  );
}

export default async function updateItem(
  itemSnapshot: firebase.firestore.DocumentSnapshot,
  currentPriceSnapshot?: firebase.firestore.DocumentSnapshot,
): Promise<void> {
  console.log('UpdateItem', 'Starting', itemSnapshot.ref.path);
  const projectId = itemSnapshot.ref.parent.parent?.id;
  if (!projectId) {
    throw new Error('Failed to get projectId');
  }

  const updatedAt = itemSnapshot.get('updatedAt') as
    | firebase.firestore.Timestamp
    | undefined;
  console.log('UpdatedAt', updatedAt?.toDate()?.toISOString());

  const priceCollection = itemSnapshot.ref.collection('prices');
  const priceTimestamp = (
    currentPriceSnapshot ??
    (await priceCollection
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get()
      .then(({ docs }) => docs[0]))
  )?.get('timestamp') as firebase.firestore.Timestamp | undefined;
  console.log('PriceTimestamp', priceTimestamp?.toDate()?.toISOString());

  if (
    (updatedAt &&
      priceTimestamp &&
      updatedAt.toMillis() >= priceTimestamp.toMillis()) ||
    !priceTimestamp
  ) {
    console.log('Not updated');
    return;
  }

  const domainLeft = DateTime.local().minus(Duration.fromISO('P30D'));
  console.log(domainLeft.toISO());

  const pricesSnapshot = await priceCollection
    .orderBy('timestamp', 'desc')
    .endBefore(firebase.firestore.Timestamp.fromDate(domainLeft.toJSDate()))
    .get();
  const prices = pricesSnapshot.docs.map(s => s.data() as Price);

  const storage = firebase.storage();

  const indices = predictIndices(prices, projectId, storage);
  const { daily, last30Days } = statPrices(prices);

  await renderAllCharts({ prices, itemSnapshot, storage });

  const newUpdatedAt =
    prices[0].timestamp || firebase.firestore.FieldValue.serverTimestamp();

  await itemSnapshot.ref.update({
    ...filterUndefined({
      indices: await indices,
      daily,
      last30Days,
    }),
    updatedAt: newUpdatedAt,
    chartUpdatedAt: newUpdatedAt,
    backgroundChartUpdatedAt: newUpdatedAt,
  });

  console.log('UpdateItem', 'Done');
}
