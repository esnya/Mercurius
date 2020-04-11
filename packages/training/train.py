import matplotlib.pyplot as plt
import numpy as np
import pickle
import matplotlib.pyplot as plt
import tensorflow as tf

import config

def build(input, *nodes):
  x = input
  for node in nodes:
    if callable(node):
      x = node(x)
    elif isinstance(node, list):
      x = [build(x, branch) for branch in node]
    elif isinstance(node, tuple):
      x = build(x, *node)
    else:
      x = node
  return x
def buildModel(input, *nodes):
  return tf.keras.models.Model(input, build(input, *nodes))


def fit(trainSet):
  x_train = np.array([x for (x, y) in trainSet])
  y_train = np.array([y for (x, y) in trainSet])

  input_shape = x_train.shape[1:]
  output_shape = y_train.shape[1:]

  # conv
  conv_options = {
    'kernel_size': 2 ** 2,
    'filters': 2 ** 6,
    'padding': 'same',
  }
  conv_layers = 2 ** 2

  # dense
  dense_options = {
    'units': 2 ** 6,
    'activation': 'relu',
  }
  hidden_dense_layers = 2 ** 2

  output_units = np.prod(output_shape)

  # compile
  compile_options = {
    'optimizer': 'adam',
    'loss': 'mean_squared_error',
    'metrics': ['accuracy'],
  }

  # fit
  fit_options = {
    'epochs': 500,
    'shuffle': True,
    'validation_split': 0.5,
    'callbacks': [tf.keras.callbacks.EarlyStopping(monitor='val_acc', mode='auto', patience=29, restore_best_weights=True)],
  }

  model = buildModel(
    tf.keras.layers.Input(input_shape),
    # [(
    #   [
    #     (
    #       tf.keras.layers.Conv1D(**conv_options),
    #       tf.keras.layers.Flatten(),
    #     ),
    #     tf.keras.layers.Flatten(),
    #   ],
    #   tf.keras.layers.Concatenate(),
    # ) for n in range(conv_layers)]
    #   if conv_layers >= 2
    #   else [(tf.keras.layers.Conv1D(**conv_options), tf.keras.layers.Flatten()), tf.keras.layers.Flatten()],
    *[tf.keras.layers.Conv1D(**conv_options) for n in range(conv_layers)],
    tf.keras.layers.Flatten(),
    *[tf.keras.layers.Dense(**dense_options) for n in range(hidden_dense_layers)],
    tf.keras.layers.Dense(output_units),
    tf.keras.layers.Reshape(output_shape),
  )

  model.summary()
  model.compile(**compile_options)
  history = model.fit(x_train, y_train, **fit_options)

  model.evaluate(x_train, y_train)

  plt.title('history')
  for metric in ['val_acc', 'acc', 'val_loss', 'loss']:
    plt.plot(history.epoch, history.history[metric], label=metric)
  plt.legend()
  plt.savefig('data/history.png')

  return model

def loadTrainSet():
  with open('data/trainset.pickle', 'rb') as f:
    return pickle.load(f)

def main():
  trainSet = loadTrainSet()

  model = fit(trainSet)
  model.save('data/model.h5')

if __name__ == '__main__':
  main()
