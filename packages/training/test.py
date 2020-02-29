import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib import rcParams
import tensorflow as tf
import preprocess as p

rcParams['font.family'] = 'sans-serif'
rcParams['font.sans-serif'] = ['Hiragino Maru Gothic Pro', 'Yu Gothic', 'Meirio', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP']


def main():
  items = p.loadItems()
  model = tf.keras.models.load_model('data/benefits.h5')

  for item in items:
    print(item['name'])

    prices = item['prices']
    interpolated, resampled = p.interpolate(prices)
    normalized, labels = p.preprocess(prices)

    xSize = model.input.shape[1]
    ySize = model.output.shape[1]

    x_test = np.array([normalized.values[n:n + xSize] for n in range(0, normalized.shape[0] - ySize, ySize) if (n + xSize < normalized.shape[0])])

    y_test = np.array([model.predict(x.reshape(1,xSize,2)) for x in x_test]).reshape(-1, 2).clip(0, 1)
    i_test = normalized.index[xSize:y_test.shape[0] + xSize + ySize]
    # print(labels.columns)
    predicted = pd.DataFrame(
      y_test[:i_test.shape[0]],
      columns=labels.columns,
      index=i_test
    )
    fig, axes = plt.subplots(nrows=3, figsize=(16,9), sharex=True)
    fig.suptitle(item['name'])
    axes[0].plot(normalized.get('price'), label='price')
    axes[0].plot(normalized.get('lottery'), label='lottery')
    axes[0].legend()

    axes[1].plot(labels.get('divestment'), label='divestment')
    axes[1].plot(labels.get('purchase'), label='purchase')
    axes[1].legend()

    axes[2].plot(predicted.get('divestment'), label='divestment')
    axes[2].plot(predicted.get('purchase'), label='purchase')

    axes[2].legend()

    plt.savefig('data/' + item['name'] + '.png')
    plt.close(fig)

if __name__ == '__main__':
  main()
