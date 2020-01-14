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

  lineChart<T>(data: { [series: string]: T[] }, title?: string): void {
    const length =
      _(data)
        .map(values => values.length)
        .max() ?? 0;

    const [values, series] = _(data)
      .map(
        (values, key) =>
          [
            _.range(length)
              .map(i => Number(values[i]))
              .map(toPoint2D)
              .slice(0, length),
            key,
          ] as [Point2D[], string],
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
