import React from 'react';
import { Icon } from 'semantic-ui-react';

export default function DiffIcon({
  diffRate,
}: {
  diffRate: number | null;
}): JSX.Element {
  if (diffRate === null) return <Icon color="grey" name="question" />;
  if (Math.abs(diffRate) > 0.7) return <Icon color="red" name="warning" />;
  if (diffRate < -0.1) return <Icon color="red" name="angle double down" />;
  if (diffRate < -0.01) return <Icon color="orange" name="angle down" />;
  if (diffRate > 0.1) return <Icon color="blue" name="angle double up" />;
  if (diffRate > 0.01) return <Icon color="teal" name="angle up" />;
  return <Icon color="green" name="minus" />;
}
