import { createGenerator, DEFAULT_CONFIG } from 'ts-json-schema-generator';
import fs from 'fs';
import path from 'path';

export async function build(src: string, dst: string): Promise<void> {
  console.log(src, '>', dst);
  const schema = createGenerator({
    ...DEFAULT_CONFIG,
    path: src,
    strictTuples: true,
    skipTypeCheck: true,
  }).createSchema(undefined);

  await fs.promises.writeFile(dst, JSON.stringify(schema, null, 2));
  await fs.promises.writeFile(
    `${dst}.d.ts`,
    [
      `import { JSONSchema7 } from 'json-schema';`,
      `declare const ${path.basename(src, '.ts')}Schema: JSONSchema7;`,
      `export default ${path.basename(src, '.ts')}Schema;`,
      '',
    ].join('\n'),
  );
}

export async function buildAll(): Promise<void> {
  const src = 'src/models-next';
  const dst = 'lib/models-next';
  const files = await fs.promises.readdir(src);

  await Promise.all(
    files
      .filter(f => f.match(/\.ts$/))
      .map(f => path.join(src, f))
      .map(f =>
        build(f, path.join(dst, `${path.basename(f, '.ts')}.schema.json`)),
      ),
  );
}
buildAll().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});
