import { fork } from 'child_process';
import fs from 'fs';
import path from 'path';
import { safeLoad } from 'js-yaml';
import mapObject from 'map-obj';

async function build(): Promise<void> {
  // try {
  //   await fs.promises.access('lib/models');
  // } catch (_e) {
  //   await fs.promises.mkdir('lib/models', { recursive: true });
  // }

  const files = await fs.promises.readdir('src/models');
  await files
    .filter(file => file.match(/\.yml$/))
    .reduce(async (p, file): Promise<void> => {
      await p;

      const src = path.join('src/models', file);
      const schema = mapObject(
        safeLoad(await fs.promises.readFile(src, 'utf-8')) ?? {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (key: any, value: any): [string, any] => {
          if (key === '$ref' && typeof value === 'string') {
            return [key, value]; //.replace(/^\.\//, './src/models/')];
          }
          return [key, value];
        },
        { deep: true },
      ) as { title: string };

      const { title } = schema;
      const dst = path.join('src/models', `${title}.ts`);

      console.log(src, '>', dst);

      const child = fork(
        '../../node_modules/quicktype/dist/cli/index.js',
        ['-s', 'schema', '-l', 'typescript', '-t', title, '--explicit-unions'],
        {
          cwd: 'src/models',
          stdio: ['pipe', 'pipe', 'inherit', 'ipc'],
        },
      );

      const { stdin, stdout } = child;
      if (!stdin || !stdout) {
        throw new Error('Failed to open pipe');
      }
      stdin.end(JSON.stringify(schema));

      const chunks: Buffer[] = [];
      stdout.on('data', (chunk): void => {
        chunks.push(chunk);
      });

      const [code] = await Promise.all([
        new Promise((resolve): void => {
          child.on('close', resolve);
        }),
        new Promise((resolve): void => {
          stdout.on('close', resolve);
        }),
      ]);

      if (code) {
        throw new Error(`quicktype exit with ${code}`);
      }

      const output = Buffer.concat(chunks).toString();
      const mType = output.match(/to.*\(json:\s*string\)\s*:\s*(.*?)\s*\{\n/);
      const type = mType ? mType[1] : title;

      const mCast = output.match(
        /return\s*cast\(JSON\.parse\(json\),\s*(.*?)\);/,
      );
      const cast = mCast ? mCast[1] : `r("${title}")`;

      const content = output.replace(
        'export class Convert {',
        [
          `export class ${title}Converter {`,
          `    public static cast(value: any): ${type} {`,
          `        return cast(value, ${cast});`,
          `    }`,
          '',
        ].join('\n'),
      );

      await fs.promises.writeFile(dst, content);
    }, Promise.resolve());
}
build()
  .then(
    () => 0,
    error => {
      console.error(error);
      return 1;
    },
  )
  .then(process.exit);
