import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Dimmer,
  Icon,
  Item,
  Loader,
  Message,
  Pagination,
  Segment,
  Table,
} from 'semantic-ui-react';
import { useAsync } from 'react-async-hook';
import _ from 'lodash';
import { DateTime, Duration } from 'luxon';
import * as tf from '@tensorflow/tfjs';
import * as tfvis from '@tensorflow/tfjs-vis';
import {
  initializeApp,
  DocumentReference,
  DocumentSnapshot,
  Query,
  QuerySnapshot,
} from '../../firebase';
import { formatInteger } from '../../utilities/format';
import { isDefined } from '../../utilities/types';
import { Point2D } from '@tensorflow/tfjs-vis';
import useAsyncEffect from '../../hooks/useAsyncEffect';

type SnapshotOf<
  R extends DocumentReference | Query
> = R extends DocumentReference
  ? DocumentSnapshot
  : R extends Query
  ? QuerySnapshot
  : never;

type ReferenceOf<
  S extends DocumentSnapshot | QuerySnapshot
> = S extends DocumentSnapshot
  ? DocumentReference
  : S extends QuerySnapshot
  ? Query
  : never;

function isDocumentSnapshot(
  value: DocumentSnapshot | QuerySnapshot,
): value is DocumentSnapshot {
  return 'ref' in value;
}

function isQuerySnapshot(
  value: DocumentSnapshot | QuerySnapshot,
): value is QuerySnapshot {
  return 'query' in value;
}

function getRef<S extends DocumentSnapshot | QuerySnapshot>(
  snapshot: S,
): ReferenceOf<S> {
  if (isDocumentSnapshot(snapshot)) {
    return snapshot.ref as ReferenceOf<S>;
  }
  if (isQuerySnapshot(snapshot)) {
    return snapshot.query as ReferenceOf<S>;
  }

  throw new TypeError();
}

function useSnapshot<R extends DocumentReference | Query>(
  ref?: R,
  options?: { get?: boolean; subscribe?: boolean; dependsOn?: any[] },
): SnapshotOf<R> | undefined {
  const [snapshot, setSnapshot] = useState<SnapshotOf<R>>();

  const get = options?.get ?? false;
  const subscribe = options?.subscribe ?? true;

  useEffect(() => {
    if (!ref) {
      return setSnapshot(undefined);
    }

    const onSnapshot = (s: SnapshotOf<R>): void => {
      setSnapshot(s);
    };

    if (get) {
      const p = ref.get() as Promise<SnapshotOf<R>>;
      p.then(onSnapshot);
    }

    if (subscribe) {
      return (ref.onSnapshot as (onNext: typeof onSnapshot) => () => void)(
        onSnapshot,
      );
    }
  }, options?.dependsOn ?? [ref]);

  return snapshot;
}

const ItemSummaryFields = [
  {
    path: 'name',
    label: 'アイテム名',
  },
];

function ItemSummary({
  itemSnapshot,
}: {
  itemSnapshot: DocumentSnapshot;
}): JSX.Element {
  if (!itemSnapshot.exists) {
    return (
      <Dimmer active>
        <Loader />
      </Dimmer>
    );
  }

  const fields = ItemSummaryFields.map(
    ({ path, label }, i): JSX.Element => (
      <Item key={i}>
        <Item.Content>
          <Item.Description>{label}</Item.Description>
          <Item.Header>{itemSnapshot.get(path)}</Item.Header>
        </Item.Content>
      </Item>
    ),
  );

  return <Item.Group>{fields}</Item.Group>;
}

function PricesTable({
  pricesSnapshot,
}: {
  pricesSnapshot: QuerySnapshot;
}): JSX.Element {
  const itemsPerPage = 10;
  const count = pricesSnapshot.size;
  const totalPages = Math.ceil(count / itemsPerPage);

  const [activePage, setActivePage] = useState(1);

  useEffect(() => {
    if (activePage > totalPages) {
      setActivePage(totalPages);
    }
  });

  const rows = pricesSnapshot.docs
    .slice((activePage - 1) * itemsPerPage)
    .slice(0, itemsPerPage)
    .map(
      (priceSnapshot, i): JSX.Element => {
        const timestamp = priceSnapshot.get('timestamp').toDate();
        const price = priceSnapshot.get('price');
        const lottery = priceSnapshot.get('lottery');
        return (
          <Table.Row key={i}>
            <Table.Cell textAlign="center">
              {DateTime.fromJSDate(timestamp).toLocaleString(
                DateTime.DATETIME_SHORT,
              )}
            </Table.Cell>
            <Table.Cell textAlign="center">{formatInteger(price)}</Table.Cell>
            <Table.Cell textAlign="center">
              <Icon
                color={lottery ? 'green' : 'grey'}
                name={lottery ? 'check' : 'minus'}
              />
            </Table.Cell>
          </Table.Row>
        );
      },
    );

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell textAlign="center">日時</Table.HeaderCell>
          <Table.HeaderCell textAlign="center">価格</Table.HeaderCell>
          <Table.HeaderCell textAlign="center">抽選</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>{rows}</Table.Body>
      <Table.Footer>
        <Table.Row>
          <Table.HeaderCell textAlign="center" colSpan="3">
            <Pagination
              activePage={activePage}
              totalPages={totalPages}
              onPageChange={(_e, { activePage }) =>
                setActivePage(activePage as number)
              }
            />
          </Table.HeaderCell>
        </Table.Row>
      </Table.Footer>
    </Table>
  );
}

interface Stats {
  count: number;
  max: number;
  min: number;
}
const InitialStats: Stats = {
  count: 0,
  max: Number.MIN_VALUE,
  min: Number.MAX_VALUE,
};
function stats(a: Stats, b: number): Stats {
  return {
    count: a.count + 1,
    max: Math.max(a.max, b),
    min: Math.min(a.min, b),
  };
}

const hours = 3;
const timeScale = hours * 60 * 60 * 1000;
const yLen = (1 * 24) / hours;
const xLen = yLen * 7;
// const layers = 3;
// const xLen = yLen * Math.pow(2, layers);
const epochs = 30;
const noise = 0.05;
const validationSplit = 0.9;
// const batchSize = 32;

const domain: [DateTime, DateTime] = [
  DateTime.local().minus({ days: 30 }),
  DateTime.local(),
];
function VIS({
  pricesSnapshot,
}: {
  itemSnapshot: DocumentSnapshot;
  pricesSnapshot: QuerySnapshot;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useAsyncEffect(async (): Promise<void> => {
    const container = containerRef.current;
    const result = resultRef.current;
    if (!container || !result) {
      throw new Error('Failed to render container');
    }

    const raw = _(pricesSnapshot.docs)
      .map(priceSnapshot => ({
        timestamp: priceSnapshot.get('timestamp').toMillis() as number,
        price: priceSnapshot.get('price') as number,
        lottery: priceSnapshot.get('lottery') as boolean,
      }))
      .groupBy(
        ({ timestamp }) =>
          Math.floor(DateTime.fromMillis(timestamp).valueOf() / timeScale) *
          timeScale,
      )
      .map((group, timestamp) => ({
        timestamp: Number(timestamp),
        price: group.reduce((p, item) => p + item.price / group.length, 0),
        lottery: group.some(item => item.lottery) ? 1 : 0,
      }))
      .sortBy(({ timestamp }) => timestamp)
      .value();
    const rawReversed = raw.slice().reverse();

    const [timestamps, prices, lotteries] = _(
      _.range(domain[0].valueOf(), domain[1].valueOf(), timeScale),
    )
      .map((timestamp): [number, number, number] => {
        const hit = raw.find(item => item.timestamp === timestamp);
        if (hit) return [timestamp, hit.price, hit.lottery];

        const left = rawReversed.find(item => item.timestamp < timestamp);
        const right = raw.find(item => item.timestamp > timestamp);

        if (left && !right) return [timestamp, left.price, left.lottery];
        if (!left && right) return [timestamp, right.price, right.lottery];

        if (!left || !right) throw new Error('Failed to collect');

        const dur = right.timestamp - left.timestamp;
        const rate = (timestamp - left.timestamp) / dur;
        const price = left.price * (1 - rate) + right.price * rate;

        return [timestamp, price, left.lottery || right.lottery];
      })
      .unzip()
      .value();

    const timestampStats = timestamps.reduce(stats, InitialStats);
    const normalizedTimestamps = timestamps.map(
      t => (t - timestampStats.min) / timeScale,
    );

    const priceStats = prices.reduce(stats, InitialStats);
    const normalizedPrices = prices.map(
      price =>
        (price - priceStats.min) / (priceStats.max - priceStats.min) +
        (Math.random() - 0.5) * 2 * noise,
    );

    const [pricePoints, lotteryPoints] = [
      _.zip(normalizedTimestamps, normalizedPrices),
      _.zip(normalizedTimestamps, lotteries),
    ].map(series =>
      series
        .map(([x, y]) => ({ x, y }))
        .filter<Point2D>(
          (point): point is Point2D => isDefined(point.x) && isDefined(point.y),
        ),
    );

    tfvis.render.scatterplot(container, {
      values: [pricePoints, lotteryPoints],
      series: ['価格', '抽選'],
    });

    const xs = [];
    const ys = [];
    for (let j = 0; j < normalizedPrices.length - xLen - yLen; j++) {
      xs.push(normalizedPrices.slice(j, j + xLen));
      ys.push(normalizedPrices.slice(j + xLen, j + xLen + yLen));
    }

    const trainX = tf.tensor2d(xs, [xs.length, xLen]);
    console.log('tx', trainX.shape);

    const trainY = tf.tensor2d(ys, [ys.length, yLen]);
    console.log('ty', trainY.shape);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: xLen,
          batchInputShape: [xs.length, xLen],
        }),
        tf.layers.dense({
          units: Math.round((xLen + yLen) / 2),
          batchInputShape: [xs.length, xLen],
        }),
        tf.layers.dense({
          units: yLen,
          batchInputShape: [xs.length, xLen],
        }),
      ],
    });
    console.log('mo', ...model.outputs.map(o => o.shape));

    tfvis.show.modelSummary(container, model);

    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

    console.log('fit');

    await model.fit(trainX, trainY, {
      epochs,
      validationSplit,
      callbacks: tfvis.show.fitCallbacks(
        container,
        ['loss', 'mse', 'val_loss'],
        {
          height: 200,
          callbacks: ['onEpochEnd'],
        },
      ),
    });

    console.log('predict');

    const predicatedPoints = _.range(
      0,
      normalizedPrices.length - xLen,
      36 / hours,
    ).map(left => {
      const sx = normalizedPrices.slice(left, left + xLen);
      const py = (model.predict(
        tf.tensor1d(sx).reshape([1, xLen]),
      ) as tf.Tensor<tf.Rank>).dataSync();

      return Array.from(py).map((y, i) => ({
        x: normalizedTimestamps[left + xLen] + i + 1,
        y,
      }));
    });

    const futureX = tf
      .tensor1d(normalizedPrices.slice(-xLen))
      .reshape([1, xLen]);
    const futureY = (model.predict(futureX) as tf.Tensor<tf.Rank>).dataSync();
    const futurePoints = Array.from(futureY).map((y, i) => ({
      x: (timestampStats.max - timestampStats.min) / timeScale + i + 1,
      y,
    }));

    // const predictedPoints = Array.from(ps).map((y, i) => ({
    //   x: (timestampStats.max - timestampStats.min) / timeScale + i + 1,
    //   y,
    // }));

    const values = [
      pricePoints,
      lotteryPoints,
      ...predicatedPoints,
      futurePoints,
    ];
    console.log(values);
    tfvis.render.scatterplot(result, {
      values,
      series: [
        '価格',
        '抽選',
        ...predicatedPoints.map((_v, i) => `予測${i + 1}`),
        '予測',
      ],
    });
  }, [pricesSnapshot]);

  return (
    <div>
      <div ref={containerRef} />
      <div ref={resultRef} />
    </div>
  );
}

export default function AI(): JSX.Element | null {
  const { projectId, itemId } = useParams();

  const appRes = useAsync(initializeApp, []);
  const app = appRes.result;

  const itemRef = app
    ?.firestore()
    .collection('projects')
    .doc(projectId)
    .collection('items')
    .doc(itemId);

  const itemSnapshot = useSnapshot<DocumentReference>(itemRef, {
    get: true,
    subscribe: false,
    dependsOn: [app, projectId, itemId],
  });

  const pricesQuery = itemRef
    ?.collection('prices')
    .orderBy('timestamp', 'desc')
    .endBefore(domain[0].valueOf());
  const pricesSnapshot = useSnapshot<Query>(pricesQuery, {
    get: true,
    subscribe: false,
    dependsOn: [app, projectId, itemId],
  });

  if (!app || !projectId || !itemId) {
    return <Message negative>不明なエラー</Message>;
  }

  if (appRes.error) {
    return <Message negative>{appRes.error.toString()}</Message>;
  }
  if (appRes.loading || !itemSnapshot || !pricesSnapshot) {
    return (
      <Dimmer active>
        <Loader />
      </Dimmer>
    );
  }

  return (
    <Container>
      <Segment>
        <ItemSummary itemSnapshot={itemSnapshot} />
        <VIS itemSnapshot={itemSnapshot} pricesSnapshot={pricesSnapshot} />
        <PricesTable pricesSnapshot={pricesSnapshot} />
      </Segment>
    </Container>
  );
}
