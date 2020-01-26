import React from 'react';
import PromiseReader from '../suspense/PromiseReader';
import { NonEmptySnapshot } from '../firebase/snapshot';
import { Price } from 'mercurius-core/lib/models/Price';
import PredictedChart from './PredictedChart';
import { Message } from 'semantic-ui-react';
import { Model, predict } from '../prediction';

export interface ItemPricePredictionProps {
  priceSnapshots: NonEmptySnapshot<Price>[];
  model?: Model;
}

export default function ItemPricePrediction({
  priceSnapshots,
  model,
}: ItemPricePredictionProps): JSX.Element {
  if (!model) {
    return <Message info>モデルが作成されていません。</Message>;
  }

  return (
    <PredictedChart
      predicted={new PromiseReader(
        predict(
          model,
          priceSnapshots.map(s => s.data),
        ),
      ).read()}
    />
  );
}
