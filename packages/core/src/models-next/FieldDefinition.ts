export default interface FieldDefinition {
  id: string;
  text: string;
  value: string;
  textAlign?: 'center' | 'left' | 'right';
  factor?: number;
  format?: 'integer' | 'percentage';
  color?: {
    factor?: number;
    minus?: boolean;
  };
}
