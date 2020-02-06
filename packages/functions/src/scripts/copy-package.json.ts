import fs from 'fs';
import pickBy from 'lodash/pickBy';

function picker(_value: string, key: string): boolean {
  return !key.match(/^(mercurius-core|@types\/.*)$/);
}

async function main(): Promise<void> {
  const src = JSON.parse(await fs.promises.readFile('package.json', 'utf-8'));
  const dst = {
    ...src,
    dependencies: pickBy(src.dependencies, picker),
    devDependencies: {},
    main: 'index.js',
  };
  await fs.promises.writeFile(
    'dist/package.json',
    JSON.stringify(dst, null, 2),
  );
}
main().then(
  () => process.exit(),
  error => {
    console.error(error);
    process.exit(1);
  },
);
