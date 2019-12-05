import firebase, { initializeApp, projectId } from '../firebase';
import { isItem } from '../types/Item';
import Price, { isPrice } from '../types/Price';
import PriceStats, { getDomain, calculate } from '../types/PriceStats';
import _ from 'lodash';
import { renderView, getColorCode } from '../utilities/chart';

const tasks: (() => void)[] = [];

const timeRange = 14;

function getSpec(
  name: string,
  domain: [number, number],
  priceStats: PriceStats,
  background: boolean,
): {} {
  const spec = background
    ? {
        padding: 0,
        layer: [{ mark: 'area' }, { mark: 'line' }],
        encoding: {
          color: {
            value: getColorCode(priceStats.endByFluctuationRate),
          },
          x: {
            axis: null,
            sort: 'descending',
          },
          y: {
            axis: null,
          },
          strokeOpacity: { value: 0.25 },
          fillOpacity: { value: 0.1 },
        },
        config: {
          view: {
            stroke: 'transparent',
          },
        },
      }
    : {
        title: name,
        encoding: {
          color: {
            value: getColorCode(priceStats.endByFluctuationRate),
          },
        },
      };

  return _.defaultsDeep(
    {
      encoding: {
        x: {
          scale: {
            domain: domain.map(a => new Date(a).toISOString()),
          },
        },
      },
    },
    spec,
  );
}

async function putChart(
  itemRef: firebase.firestore.DocumentReference,
  name: string,
  priceStats: PriceStats,
  prices: Price[],
  background: boolean,
): Promise<void> {
  const filename = background ? 'backgroundChart' : 'chart';

  const ref = itemRef.firestore.app
    .storage()
    .ref(itemRef.path)
    .child(filename);

  console.log('render', ref.fullPath);

  const domain = getDomain(timeRange);
  const view = await renderView(
    getSpec(name, domain, priceStats, background),
    prices
      .map(({ timestamp, ...others }) => ({
        ...others,
        timestamp: timestamp.toMillis(),
      }))
      .filter(
        ({ timestamp }) => domain[0] <= timestamp && timestamp <= domain[1],
      ),
  );

  const canvas = await view.toCanvas();
  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) {
    throw new Error('Failed to render into Blob');
  }

  await ref.put(blob);

  await itemRef.update({
    [`${filename}UpdatedAt`]: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function calculateStats(
  itemRef: firebase.firestore.DocumentReference,
  name: string,
  prices: Price[],
  timeRange: number,
  timestamp: firebase.firestore.Timestamp,
): Promise<void> {
  const priceStats = calculate(prices, timeRange);
  const updateData = priceStats
    ? {
        priceStats: _.pickBy(priceStats, a => a !== undefined),
        updatedAt: timestamp,
      }
    : {
        updatedAt: timestamp,
      };

  await itemRef.update(updateData);

  if (priceStats) {
    tasks.push(() => putChart(itemRef, name, priceStats, prices, true));
    tasks.push(() => putChart(itemRef, name, priceStats, prices, false));
  }
}

async function run(): Promise<void> {
  setInterval(() => {
    const task = tasks.pop();
    if (task) task();
  }, 500);

  const app = await initializeApp();
  const projectRef = app
    .firestore()
    .collection('projects')
    .doc(projectId);
  const itemsRef = projectRef.collection('items');

  const unsubscribeMap = new Map<string, () => void>();

  itemsRef.onSnapshot(itemsSnapshot => {
    itemsSnapshot.docs.map((doc): void => {
      const item = doc.data();
      if (!isItem(item)) return;

      const itemRef = doc.ref;
      const path = itemRef.path;

      const u = unsubscribeMap.get(path);
      if (u) {
        u();
        unsubscribeMap.delete(path);
      }

      const pricesRef = itemRef.collection('prices');
      const unsubscribe = pricesRef
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot((priceSnapshot): void => {
          const price = priceSnapshot.docs[0] && priceSnapshot.docs[0].data();
          if (!isPrice(price)) return;

          if (
            !item.updatedAt ||
            item.updatedAt.toMillis() < price.timestamp.toMillis() ||
            !item.backgroundChartUpdatedAt ||
            !item.chartUpdatedAt
          ) {
            tasks.push(
              async (): Promise<void> => {
                console.log('analyze', item.name);
                const pricesSnapshot = await pricesRef
                  .orderBy('timestamp', 'desc')
                  .endAt(getDomain(timeRange)[1])
                  .get();
                const prices = pricesSnapshot.docs
                  .map(s => s.data())
                  .filter(isPrice);

                await calculateStats(
                  itemRef,
                  item.name,
                  prices,
                  timeRange,
                  price.timestamp,
                );
              },
            );
          }
        });
      unsubscribeMap.set(path, unsubscribe);
    });
  });
}
run().catch(console.error);
