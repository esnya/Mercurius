import React from 'react';
import { Label, Icon } from 'semantic-ui-react';
import { formatPercent } from '../utilities/format';
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

export default function RateLabel({
  rate,
  textFactor,
  colorFactor,
}: {
  rate?: number;
  textFactor?: number;
  colorFactor?: number;
}): JSX.Element {
  if (rate === undefined) {
    return (
      <Label color="grey">
        <Icon name="question" />
      </Label>
    );
  }

  const colorRate = rate * (colorFactor ?? 1);

  return (
    <Label
      color={getByRate(colors, colorRate)}
      style={{ whiteSpace: 'nowrap' }}
    >
      <Icon name={getByRate(icons, colorRate)} />
      {formatPercent(rate * 100 * (textFactor ?? 1))}
    </Label>
  );
}
