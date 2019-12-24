import { SemanticCOLORS } from 'semantic-ui-react/dist/commonjs/generic';

const Colors: SemanticCOLORS[] = [
  'red',
  'orange',
  'yellow',
  'olive',
  'green',
  'teal',
  'blue',
  'violet',
  'purple',
];

export function getColorName(rate: number): SemanticCOLORS {
  return Colors[
    Math.floor((Colors.length - 1) * Math.max(Math.min(rate, 1), 0))
  ];
}

export function getColorCode(value: number): SemanticCOLORS | string {
  const color = getColorName(value);
  if (color === 'yellow') return '#FFD700';
  return color;
}
