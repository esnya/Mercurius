export default interface StatField {
  path: string;
  text: string;
  format: (value: number) => string;
  factor?: number;
  color?: {
    factor?: number;
    minus?: boolean,
  };
  textAlign?: 'right' | 'left' | 'center';
}
