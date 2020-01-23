import firebase from 'firebase-admin';
import fs from 'fs';

const projectId = '2Tu5ixUoI2DnD55s7uYs'

async function initializeApp(): Promise<firebase.app.App> {
  const serviceAccount = await fs.promises.readFile('service-account.json', 'ascii');
  return await firebase.initializeApp({
    credential: firebase.credential.cert(JSON.parse(serviceAccount)),
    databaseURL: "https://mercurius-6026e.firebaseio.com"
  })
}

async function main(): Promise<void> {
  const app = await initializeApp();
  const firestore = app.firestore();
  const itemsQuery = firestore.collection('projects').doc(projectId).collection('items').orderBy('priceStats.fluctuationRate', 'desc').endAt(0.5);
  const itemsSnapshot = await itemsQuery.get();
  console.log(`${itemsSnapshot.size} items`);
  const result = await itemsSnapshot.docs.reduce(async (promise, itemSnapshot): Promise<firebase.firestore.DocumentData[]> => {
    const prev = await promise;

    console.group(itemSnapshot.get('name'));
    const pricesQuery = itemSnapshot.ref.collection('prices').orderBy('timestamp', 'asc').startAt(new Date(Date.now() - 1000 * 60 * 60 * 24 * 60));
    const pricesSnapshot = await pricesQuery.get();
    console.log(`${pricesSnapshot.size} prices`);
    console.groupEnd();

    return [
      ...prev,
      {
        ...itemSnapshot.data(),
        prices: pricesSnapshot.docs.map(s => s.data()).map(({ timestamp, ...others}) => ({ ...others, timestamp: timestamp.toMillis() })),
      },
    ];
  }, Promise.resolve(new Array<firebase.firestore.DocumentData>()));

  await fs.promises.mkdir(`${__dirname}/data`, { recursive: true });
  await fs.promises.writeFile(`${__dirname}/data/items.json`, JSON.stringify({ items: result }, null, 2));
}
main().then(() => console.log('OK'), (e) => {
  console.error(e);
  process.exit(1);
});
