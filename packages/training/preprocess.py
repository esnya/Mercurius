import math
import codecs
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import rcParams
import pickle
import matplotlib.pyplot as plt
import common

xDuration = pd.to_timedelta('14D')
yDuration = pd.to_timedelta('3D')
timeDelta = pd.to_timedelta('3H')
benefitThreshold = 1.5

def loadItems():
  import json
  import re

  with codecs.open('data/items.json', 'r', 'UTF-8') as f:
    return [item for item in json.load(f)['items'] if len(item['prices']) >= 100][0:100]

def interpolate(prices):
  index = [pd.to_datetime(price['timestamp'] * 1000000) for price in prices]
  quantized = pd.DataFrame(data = {
    'price': [price['price'] for price in prices],
    'lottery': [1 if price['lottery'] else 0 for price in prices],
  }, index = index)

  resampled = quantized.resample(timeDelta).mean()
  interpolated = resampled.interpolate(method='linear')
  return interpolated, resampled

def normalize(interpolated, resampled):
  max = resampled.max()
  return interpolated.transform({
    'price': lambda price: price / max.get('price'),
    'lottery': lambda x: x,
  })

def evaluate(interpolated):
  win = '7D'
  shift = math.ceil(pd.to_timedelta(win).total_seconds() / timeDelta.total_seconds())

  prices = interpolated['price']
  rolled = prices.rolling(win)
  max = rolled.max().shift(-shift)
  min = rolled.min()
  diff = prices - prices.shift(1)
  roid = diff / prices.shift(1)

  res = pd.DataFrame({
    'max': max,
    'min': min,
    'diff': diff,
    'roid': roid,
    'divestment': ((prices - min) / min)[diff >= 0],
    'purchase': ((max - prices) / prices)[diff >= -0.1],
    'increase': np.zeros(roid.shape),
    'decrease': np.zeros(roid.shape),
  }).fillna(0)

  res['increase'][roid > 0.01] = 1
  res['decrease'][roid < -0.01] = 1
  res['divestment'][res['divestment'] <= 1] = 0
  res['divestment'][res['divestment'] > 0] = 1
  res['purchase'][res['purchase'] <= 1] = 0
  res['purchase'][res['purchase'] > 0] = 1

  return pd.DataFrame({
    'divestment': res['divestment'],
    'purchase': res['purchase'],
    # 'increase': res['increase'],
    # 'decrease': res['decrease'],
  })

def preprocess(prices):
  interpolated, resampled = interpolate(prices)

  normalized = normalize(interpolated, resampled)
  labels = evaluate(interpolated)

  return normalized.reindex(labels.index), labels

def toTrainSet(normalized, labels):
  trainSet = [(normalized[left:left + xDuration - timeDelta], labels[left + xDuration:left + xDuration + yDuration - timeDelta]) for left in normalized.index]

  xSize = 224 #max([x.size for (x, y) in trainSet])
  ySize = 48 #max([y.size for (x, y) in trainSet])
  print(trainSet[0][0].values.size)
  print(trainSet[0][1].values.size)

  return [(x.values, y.values) for (x, y) in trainSet if x.size == xSize and y.size == ySize]

def plot(item, normalized, benefitIndices):
  fig, axes = plt.subplots(nrows=3, figsize=(16,9), sharex=True)
  fig.suptitle(item['name'])
  axes[0].plot(normalized.get('price'), label='price')
  axes[0].plot(normalized.get('lottery'), label='lottery')
  axes[0].legend()

  axes[1].plot(benefitIndices.get('divestment'), label='divestment')
  axes[1].plot(benefitIndices.get('purchase'), label='purchase')
  axes[1].legend()

  # axes[2].plot(benefitIndices.get('increase'), label='increase')
  # axes[2].plot(benefitIndices.get('decrease'), label='decrease')
  # axes[2].legend()

  plt.savefig('data/evalution/' + item['name'] + '.png')
  plt.close(fig)

def itemToTrainSet(item):
  print(item['name'])
  prices = item['prices']
  normalized, labels = preprocess(prices)

  if [s.hasnans for col, s in labels.items()].count(True) > 0:
    return

  if labels.max().max() == 0:
    return

  plot(item, normalized, labels)

  return toTrainSet(normalized, labels)

def main():
  from itertools import chain

  items = loadItems()
  trainSet = list(chain.from_iterable(([ts for ts in [itemToTrainSet(item) for item in items] if ts])))

  with open('data/trainset.pickle', 'wb') as f:
    pickle.dump(trainSet, f)

if __name__ == '__main__':
  main()
