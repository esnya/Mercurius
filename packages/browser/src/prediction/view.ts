import { NormalizedPrice, IncreasingOrDecreasing } from './types';
import { render, show, Point2D } from '@tensorflow/tfjs-vis';
import { Model } from './model';
import _ from 'lodash';

function toPoint2D(y: number): Point2D {
  return { x: 0, y };
}

export default class View {
  constructor(readonly container: HTMLElement) {
    this.clear();
  }

  private addSurface(title?: string): HTMLElement {
    const surface = document.createElement('div');
    if (title) {
      const h = document.createElement('h3');
      h.innerText = title;
      this.container.appendChild(h);
    }
    this.container.appendChild(surface);
    return surface;
  }

  modelSummary(model: Model): void {
    show.modelSummary(this.addSurface('Model Summary'), model);
  }

  encoded(normalized: NormalizedPrice[]): void {
    this.lineChart(
      {
        price: normalized.map(p => p.price),
        lottery: normalized.map(p => p.lottery),
      },
      'Encoded',
    );
  }

  rate(
    rates: IncreasingOrDecreasing<boolean>[],
    title = 'Rates of increase or decrease',
  ): void {
    this.lineChart(
      {
        increasing: rates.map(r => (r.increasing ? 1 : 0)),
        decreasing: rates.map(r => (r.decreasing ? -1 : 0)),
      },
      title,
    );
  }

  buyOrSell(
    rates: IncreasingOrDecreasing<boolean>[],
    title = 'Buy or sell',
  ): void {
    this.lineChart(
      {
        buy: rates.map(r => (r.buy ? 1 : 0)),
        sell: rates.map(r => (r.sell ? -1 : 0)),
      },
      title,
    );
  }

  lineChart(data: { [series: string]: number[] }, title?: string): void {
    const length =
      _(data)
        .map(values => values.length)
        .min() ?? 0;

    if (_.some(data, values => values.length > length)) {
      console.error(
        'Warning',
        'length of values are not matched',
        _.mapValues(data, values => values.length),
      );
    }

    const [values, series] = _(data)
      .map(
        (values, key) =>
          [values.map(toPoint2D).slice(0, length), key] as [Point2D[], string],
      )
      .unzip()
      .value() as [Point2D[][], string[]];
    render.linechart(this.addSurface(title), { values, series });
  }

  fitCallbacks(metrics: string[]): ReturnType<typeof show.fitCallbacks> {
    return show.fitCallbacks(this.addSurface('Training'), metrics);
  }

  clear(): void {
    this.container.innerHTML = '';
  }
}