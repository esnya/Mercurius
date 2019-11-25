declare module '*.schema.yml' {
  import Schema from './Schema';
  const schema: Schema;
  export = schema;
}
