import firebase from 'firebase-admin';
import { DateTime, Duration } from 'luxon';
import predictIndices from './indices';
import { statPrices } from './stats';
import renderAllCharts from './chart';
import { serverTimestamp } from 'mercurius-core/lib/firestore/types';
import chunk from 'lodash/chunk';
import firestore from './firestore';

export default async function updateItem(itemPath: string): Promise<void> {
  console.log('UpdateItem', 'Starting', itemPath);

  const [projectId, itemId] = chunk(itemPath.split(/\//g), 2).map(a => a[1]);

  const projectRef = firestore.projectCollection.doc(projectId);

  const itemRef = firestore.getItemCollection(projectRef).doc(itemId);
  const itemSnapshot = await itemRef.get();
  const item = itemSnapshot.data();

  if (!item) throw new Error('Item does not exist');

  const { updatedAt } = item;
  console.log('UpdatedAt', updatedAt && new Date(updatedAt).toISOString());

  const priceCollection = firestore.getPriceCollection(itemRef);

  const {
    docs: [lastPriceSnapshot],
  } = await priceCollection
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();
  const lastPrice = lastPriceSnapshot?.data();
  const lastPriceTimestamp = lastPrice?.timestamp;
  console.log(
    'CurrentPriceTimestamp',
    lastPriceTimestamp && new Date(lastPriceTimestamp).toISOString(),
  );

  if (
    (updatedAt && lastPriceTimestamp && updatedAt >= lastPriceTimestamp) ||
    !lastPriceTimestamp
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
  const prices = pricesSnapshot.docs.map(s => s.data());

  const storage = firebase.storage();

  const indices = predictIndices(prices, projectId, storage);
  const { daily, last30Days } = statPrices(prices);

  await renderAllCharts({ prices, itemSnapshot, storage });

  const newUpdatedAt = prices[0].timestamp || serverTimestamp;

  await itemSnapshot.ref.update({
    indices: await indices,
    daily,
    last30Days,
    updatedAt: newUpdatedAt,
    chartUpdatedAt: newUpdatedAt,
    backgroundChartUpdatedAt: newUpdatedAt,
  });

  console.log('UpdateItem', 'Done');
}
