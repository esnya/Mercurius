import {
  SemanticCOLORS,
  SemanticICONS,
} from 'semantic-ui-react/dist/commonjs/generic';

export const icons: SemanticICONS[] = [
  'angle double down',
  'angle down',

  'minus',
  // 'arrow right',

  'angle up',
  'angle double up',
];

export const colors: SemanticCOLORS[] = [
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

export function getByRate<T>(items: T[], rate: number): T {
  const center = Math.floor(items.length / 2);

  if (Math.abs(rate) < 0.1) return items[center];

  const i =
    Math.round((center - 1) * Math.min(Math.abs(rate), 1) + 1) *
    Math.sign(rate);

  return items[center + i];
}

export function getColor(rate: number): SemanticCOLORS {
  return getByRate(colors, rate);
}

export function getIcon(rate: number): SemanticICONS {
  return getByRate(icons, rate);
}
