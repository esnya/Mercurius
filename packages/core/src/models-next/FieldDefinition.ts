import { Expression } from './Expression';

export default interface FieldDefinition {
  id: string;
  text: string;
  value: Expression<number | null | undefined>;
  textAlign?: 'center' | 'left' | 'right';
  factor?: number;
  format?: 'integer' | 'percentage';
  color?: {
    factor?: number;
    minus?: boolean;
  };
}
