interface Schema {
  title?: string;
  type: 'object' | 'array' | 'number' | 'string' | 'boolean';
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
}
