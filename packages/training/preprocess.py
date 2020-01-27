import math
import codecs
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import rcParams
import pickle

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

def preprocess(prices):
  interpolated, resampled = interpolate(prices)

  min = resampled.min()
  max = resampled.max()

  normalized = interpolated.transform({
    # 'price': lambda price: (price - min.get('price')) / (max.get('price') - min.get('price')),
    'price': lambda price: price / max.get('price'),
    # 'price': lambda price: price / 5000000,
    'lottery': lambda x: x,
  })

  rightMax = interpolated.rolling('14D').max()
  leftMin = interpolated.rolling('14D', closed='left').min()

  raiseAndFallRates = ((interpolated.shift(periods=-1) - interpolated) / interpolated * (24 / 6)).shift(periods=1).get('price')
  raiseAndFall = pd.DataFrame({
    'rate': raiseAndFallRates,
    'index': raiseAndFallRates.transform(lambda x: 1 if x > 0.1 else (-1 if x < -0.1 else 0)),
  })

  benefits = pd.DataFrame({
    'divestment': ((interpolated - leftMin) / leftMin)['price'],
    'purchase': ((rightMax - interpolated) / interpolated)['price'],
  })
  benefits.loc[raiseAndFall['index'] < 0, 'divestment'] = 0
  benefitIndices = benefits.applymap(lambda x: 1 if x >= benefitThreshold else 0)

  return normalized, benefitIndices

def toTrainSet(normalized, benefitIndices):
  trainSet = [(normalized[left:left + xDuration - timeDelta], benefitIndices[left + xDuration:left + xDuration + yDuration - timeDelta]) for left in normalized.index]

  xSize = max([x.size for (x, y) in trainSet])
  ySize = max([y.size for (x, y) in trainSet])

  return [(x, y) for (x, y) in trainSet if x.size == xSize and y.size == ySize]

def itemToTrainSet(item):
  print(item['name'])
  prices = item['prices']
  normalized, benefitIndices = preprocess(prices)
  return toTrainSet(normalized, benefitIndices)

def main():
  from itertools import chain

  items = loadItems()
  trainSet = list(chain.from_iterable(([itemToTrainSet(item) for item in items])))

  with open('data/trainset.pickle', 'wb') as f:
    pickle.dump(trainSet, f)

if __name__ == '__main__':
  main()
