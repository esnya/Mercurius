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
    return [item for item in json.load(f)['items'] if re.search(u'のレシピ', item['name'])][0:50]

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

def evaluate(normalized):
  window = '7D'
  shift = math.ceil(pd.to_timedelta(window).total_seconds() / timeDelta.total_seconds())

  price = normalized['price']

  diff = price.diff()
  rolledMin = price.rolling(window, min_periods=1).min()
  rolledMax = price.rolling(window, closed='left', min_periods=1).max().shift(-shift)

  rateByRolledMin = (price - rolledMin) / rolledMin
  rateByRolledMax = (rolledMax - price) / price
  rateOfWindow = (rolledMax - rolledMin) / rolledMin

  labels = (pd.DataFrame({
    'divestment': rateByRolledMax[diff >= 0],
    'purchase': rateByRolledMin,
  })[rateOfWindow >= 2.0] <= 1.5) > 0

  return labels.reindex(rateOfWindow.index[0:-shift]).fillna(0)

def preprocess(prices):
  interpolated, resampled = interpolate(prices)

  min = resampled.min()
  max = resampled.max()

  normalized = normalize(interpolated, resampled)
  labels = evaluate(normalized)

  return normalized.reindex(labels.index), labels

def toTrainSet(normalized, labels):
  trainSet = [(normalized[left:left + xDuration - timeDelta], labels[left + xDuration:left + xDuration + yDuration - timeDelta]) for left in normalized.index]

  xSize = 224 #max([x.size for (x, y) in trainSet])
  ySize = 48 #max([y.size for (x, y) in trainSet])

  return [(x.values, y.values) for (x, y) in trainSet if x.size == xSize and y.size == ySize]

def plot(item, normalized, benefitIndices):
  fig, axes = plt.subplots(nrows=2, figsize=(16,9), sharex=True)
  fig.suptitle(item['name'])
  axes[0].plot(normalized.get('price'), label='price')
  axes[0].plot(normalized.get('lottery'), label='lottery')
  axes[0].legend()

  axes[1].plot(benefitIndices.get('divestment'), label='divestment')
  axes[1].plot(benefitIndices.get('purchase'), label='purchase')
  axes[1].legend()

  plt.savefig('data/' + item['name'] + '.png')
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
