import {
  DocumentReference,
  Timestamp,
  DocumentSnapshot,
  CollectionReference,
} from '@google-cloud/firestore';
import firebase from 'firebase-admin';
import moment = require('moment');
import _ = require('lodash');
import { renderChart, backgroundChartSpec, chartSpec } from './chart';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isTimestamp(value: any): value is Timestamp {
  return typeof value === 'object' && typeof value.toMillis === 'function';
}

export class Item {
  constructor(
    readonly ref: DocumentReference,
    readonly name: string,
    readonly type: string,
    readonly updatedAt?: Timestamp,
    readonly backgroundChartUpdatedAt?: Timestamp,
    readonly chartUpdatedAt?: Timestamp,
  ) {}

  static parse(snapshot: DocumentSnapshot): Item | null {
    if (!snapshot.exists) return null;

    const name = snapshot.get('name');
    if (typeof name !== 'string') return null;

    const type = snapshot.get('type');
    const updatedAt = snapshot.get('updatedAt');
    const backgroundChartUpdatedAt = snapshot.get('backgroundChartUpdatedAt');
    const chartUpdatedAt = snapshot.get('chartUpdatedAt');

    return new Item(
      snapshot.ref,
      name,
      typeof type === 'string' && type ? type : 'item',
      isTimestamp(updatedAt) ? updatedAt : undefined,
      isTimestamp(backgroundChartUpdatedAt)
        ? backgroundChartUpdatedAt
        : undefined,
      isTimestamp(chartUpdatedAt) ? chartUpdatedAt : undefined,
    );
  }
}

export class Price {
  constructor(
    readonly ref: DocumentReference,
    readonly price: number,
    readonly timestamp: Timestamp,
    readonly lottery: boolean,
  ) {}

  static parse(snapshot: DocumentSnapshot): Price | null {
    if (!snapshot.exists) return null;

    const price = snapshot.get('price');
    if (typeof price !== 'number') return null;

    const timestamp = snapshot.get('timestamp');
    if (!isTimestamp(timestamp)) return null;

    const lottery = Boolean(snapshot.get('lottery'));

    return new Price(snapshot.ref, price, timestamp, lottery);
  }

  static async getLast(ref: CollectionReference): Promise<Price | null> {
    const snapshot = await ref
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    const first = snapshot.docs[0];
    if (!first) return null;

    return this.parse(first);
  }
}

function domainFilter(
  domain: number[],
): (item: { timestamp: Timestamp }) => boolean {
  if (domain.length < 2) throw new TypeError('domain must contain 2 numbers');

  const min = Math.min(...domain);
  const max = Math.max(...domain);

  return ({ timestamp }): boolean => {
    const millis = timestamp.toMillis();
    return min <= millis && millis <= max;
  };
}

async function calculatePriceStats(
  itemRef: DocumentReference,
  {
    itemSnapshot,
    priceRef,
    priceSnapshot,
  }: {
    itemSnapshot?: DocumentSnapshot;
    priceRef?: DocumentReference;
    priceSnapshot?: DocumentSnapshot;
  },
): Promise<{
  item: Item;
  prices: Price[];
  domain: number[];
  priceStats?: { endByFluctuationRate: number };
} | null> {
  console.debug(
    'calculating',
    itemRef.path,
    priceRef && priceRef.path,
    itemSnapshot && itemSnapshot.data(),
  );

  const item = Item.parse(itemSnapshot || (await itemRef.get()));
  if (!item) {
    console.debug('no item');
    return null;
  }

  const pricesRef = itemRef.collection('prices');
  const lastPrice = priceSnapshot
    ? Price.parse(priceSnapshot)
    : priceRef
    ? Price.parse(await priceRef.get())
    : await Price.getLast(pricesRef);
  const lastPriceTimestamp =
    lastPrice && lastPrice.timestamp
      ? lastPrice.timestamp
      : Timestamp.fromDate(new Date());

  const dirty =
    !item.updatedAt ||
    item.updatedAt.toMillis() < lastPriceTimestamp.toMillis();
  const chartDirty = !item.backgroundChartUpdatedAt || !item.chartUpdatedAt;
  if (!dirty && !chartDirty) {
    console.debug('non dirty');
    return null;
  }

  const domain = [
    moment()
      .subtract(14, 'days')
      .valueOf(),
    Date.now(),
  ];
  const pricesSnapshot = await pricesRef
    .orderBy('timestamp', 'desc')
    .endAt(Math.min(...domain))
    .get();

  const prices = pricesSnapshot.docs
    .map(Price.parse)
    .filter(price => price !== null) as Price[];

  const count = prices.length;
  if (count === 0) {
    console.debug('no prices');
    return null;
  }

  if (!dirty) {
    console.log('non dirty');
    return chartDirty ? { item, prices, domain } : null;
  }

  const begin = prices[count - 1].price;
  const end = prices[0].price;

  const { min, max, sum, sumOfSquares } = prices.reduce(
    (prev, { price }) => ({
      max: Math.max(prev.max, price),
      min: Math.min(prev.min, price),
      sum: prev.sum + price,
      sumOfSquares: prev.sumOfSquares + Math.pow(price, 2),
    }),
    {
      max: begin,
      min: begin,
      sum: 0,
      sumOfSquares: 0,
    },
  );

  const average = sum / count;

  const verbose = sumOfSquares - Math.pow(average, 2);
  const stdDev = Math.sqrt(verbose);
  const fluctuation = max - min;
  const fluctuationRate = fluctuation / min;
  const endByFluctuationRate = fluctuation ? (end - min) / fluctuation : 1;

  const previousDomain = [
    domain[0],
    moment(prices[0].timestamp)
      .subtract(24, 'hours')
      .valueOf(),
  ];

  const endOfLastPrice = prices.find(domainFilter(previousDomain));
  const lastPricesDomain = endOfLastPrice && [
    moment(endOfLastPrice.timestamp.toMillis())
      .subtract(1, 'day')
      .valueOf(),
    endOfLastPrice.timestamp.toMillis(),
  ];
  const lastPricesStats =
    lastPricesDomain &&
    prices.filter(domainFilter(lastPricesDomain)).reduce(
      ({ count, sum }, { price }) => ({
        count: count + 1,
        sum: sum + price,
      }),
      { count: 0, sum: 0 },
    );
  const lastPriceAverage =
    lastPricesStats && lastPricesStats.sum / lastPricesStats.count;

  const variationDuration =
    endOfLastPrice &&
    prices[0].timestamp.toMillis() - endOfLastPrice.timestamp.toMillis();
  const variation = lastPriceAverage && end - lastPriceAverage;
  const variationPerDay =
    variation &&
    variationDuration &&
    variation /
      (variationDuration / moment.duration(1, 'day').asMilliseconds());
  const variationRate =
    variationPerDay && lastPriceAverage && variationPerDay / lastPriceAverage;

  const priceStats = {
    begin,
    end,
    min,
    max,
    sum,
    sumOfSquares,
    average,
    verbose,
    stdDev,
    fluctuation,
    fluctuationRate,
    endByFluctuationRate,
    lastPriceAverage,
    variationDuration,
    variation,
    variationPerDay,
    variationRate,
  };

  const data = {
    priceStats: _.pickBy(priceStats, value => value !== undefined),
    updatedAt: prices[0].timestamp,
  };

  await itemRef.update(data);
  console.debug('done', data);

  return { item, prices, domain, priceStats };
}

export async function updatePriceStats(
  itemRef: DocumentReference,
  options: {
    storage: firebase.storage.Storage;
    itemSnapshot?: DocumentSnapshot;
    priceRef?: DocumentReference;
    priceSnapshot?: DocumentSnapshot;
  },
): Promise<void> {
  const { storage, ...calculateOptions } = options;

  const res = await calculatePriceStats(itemRef, calculateOptions);
  if (!res) return;

  const chartOptions = {
    ...res,
    storage,
    itemRef,
  };
  await Promise.all([
    renderChart({
      ...chartOptions,
      spec: backgroundChartSpec,
      type: 'backgroundChart',
    }),
    renderChart({
      ...chartOptions,
      spec: chartSpec,
      type: 'chart',
    }),
  ]);
}