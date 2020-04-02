import React from 'react';
import { Progress } from 'semantic-ui-react';
import { getColor } from '../utilities/rating';

export interface MinMaxCurrentBarProps {
  min: number;
  max: number;
  current: number;
  format?: (value: number) => string;
}

export default function MinMaxCurrentBar({
  min,
  max,
  current,
  format,
}: MinMaxCurrentBarProps): JSX.Element {
  const rate = (current - min) / (max - min);

  return (
    <div>
      <Progress percent={Math.floor(rate * 100)} color={getColor(rate)}>
        <div>{format ? format(current) : current}</div>
        <div>
          {format ? format(min) : min}～{format ? format(max) : max})
        </div>
      </Progress>
    </div>
  );
}
