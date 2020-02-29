import pandas as pd

if __name__ == '__main__':
  import common
  import preprocess
  import matplotlib.pyplot as plt
  import math

  for item in preprocess.loadItems():
    interpolated, resampled = preprocess.interpolate(item['prices'])
    normalized = preprocess.normalize(interpolated, resampled)

    window = '7D'
    shift = math.ceil(pd.to_timedelta(window).total_seconds() / preprocess.timeDelta.total_seconds())

    rolledMin = interpolated['price'].rolling(window, min_periods=1).min()
    rolledMax = interpolated['price'].rolling(window, closed='left', min_periods=1).max().shift(-shift)

    fig, axes = plt.subplots(nrows=3, figsize=(16,9), sharex=True)
    fig.suptitle(item['name'])
    axes[0].plot(interpolated['price'], label='price')
    axes[0].plot(rolledMin, label='rolledMin')
    axes[0].plot(rolledMax, label='rolledMax')
    axes[0].vlines(interpolated[interpolated['lottery'] == 1].index, label='lottery', ymin=0, ymax=interpolated['price'].max(), color='red')

    diff = normalized['price'].diff()

    rateByRolledMin = (interpolated['price'] - rolledMin) / rolledMin
    rateByRolledMax = (rolledMax - interpolated['price']) / interpolated['price']
    rateOfWindow = (rolledMax - rolledMin) / rolledMin
    position = rateOfWindow[diff >= 0][rateOfWindow >= 2.0]
    axes[1].plot(rateByRolledMin, label='rateByRolledMin')
    axes[1].plot(rateByRolledMax, label='rateByRolledMax')
    axes[1].plot(rateOfWindow, label='rateOfWindow')
    axes[1].vlines(position.index, ymin=0, ymax=2, color='red', label='position')

    labels = preprocess.evaluate(interpolated)
    axes[2].plot(labels['purchase'], label='purchase')
    axes[2].plot(labels['divestment'], label='divestment')

    for axis in axes:
      axis.legend()

    # plt.savefig('data/' + item['name'] + '.png')
    plt.show()
    plt.close(fig)
