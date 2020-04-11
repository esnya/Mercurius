import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib import rcParams
import tensorflow as tf
import preprocess as p

rcParams['font.family'] = 'sans-serif'
rcParams['font.sans-serif'] = ['Hiragino Maru Gothic Pro', 'Yu Gothic', 'Meirio', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP']

def plotDataFrame(target, data, columns):
  for column in columns:
    print(target)
    target.plot(data[column], label=column)
  target.legend()

def main():
  items = p.loadItems()
  model = tf.keras.models.load_model('data/benefits.h5')

  for item in items:
    print(item['name'])

    prices = item['prices']
    interpolated, resampled = p.interpolate(prices)
    normalized, evaluations = p.preprocess(prices)

    input_shape = model.input.shape[1:]
    print('input_shape', input_shape)
    output_shape = model.output.shape[1:]
    print('output_shape', output_shape)

    input_len = input_shape[0]
    output_len = output_shape[0]

    test_input_list = np.array([
      normalized.values[n:n + input_len]
        for n
        in range(0, normalized.shape[0] - output_len, output_len)
        if (n + input_len < normalized.shape[0])
    ]).reshape(-1, 1, *input_shape)
    print('test_input_list', test_input_list.shape)

    predicted_output = np.array([
      model.predict(test_input)
        for test_input
        in test_input_list
    ]).reshape(-1, output_shape[1])
    print('predicted_output', predicted_output.shape)

    index = normalized.index[input_len:input_len + predicted_output.shape[0]]
    print('index', index.shape)

    predicted = pd.DataFrame(
      predicted_output[:index.shape[0]],
      columns=evaluations.columns[0:model.output.shape[2]],
      # columns=['purchase'],
      index=index,
    )
    fig, axes = plt.subplots(nrows=4, figsize=(16,9), sharex=True)
    fig.suptitle(item['name'])
    plotDataFrame(axes[0], normalized, normalized.columns)
    plotDataFrame(axes[1], evaluations, predicted.columns)
    plotDataFrame(axes[2], predicted, predicted.columns)

    plt.savefig('data/' + item['name'] + '.png')
    plt.close(fig)


if __name__ == '__main__':
  main()
