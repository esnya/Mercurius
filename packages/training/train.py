import matplotlib.pyplot as plt
import numpy as np
import pickle
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import Input, Dense, Flatten, Reshape, LSTM, Concatenate, Conv1D, Conv2D, ConvLSTM2D
from tensorflow.keras.callbacks import EarlyStopping

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
  return Model(input, build(input, *nodes))


def fit(trainSet):
  x_train = np.array([x for (x, y) in trainSet])
  y_train = np.array([y for (x, y) in trainSet])[:, :, :2]
  y_train[:, :, 1] = 0

  input_shape = x_train.shape[1:]
  output_shape = y_train.shape[1:]

  output_units = np.prod(output_shape)

  kernel_size = 3
  filters = 2 ** 8
  lstm_hidden_units = 2 ** 8
  hidden_dense_units = 2 ** 8
  hidden_dense_layers = 2 ** 2

  patience = 10
  epochs = 20
  validation_split = 0.5
  callbacks = [EarlyStopping(monitor='val_loss', mode='auto', patience=50)]

  print('input_shape:', input_shape)
  print('output_shape:', output_shape)

  model = buildModel(
    Input(input_shape),
    [(
      Conv1D(kernel_size=kernel_size, filters=filters, padding='same'),
      LSTM(lstm_hidden_units, return_sequences=False),
      *[Dense(hidden_dense_units, activation='relu') for n in range(hidden_dense_layers)],
      Dense(output_shape[0]),
    ) for n in range(output_shape[1])],
    Concatenate(1),
    Reshape(output_shape),
  )
  model.summary()
  # print({
  #   'input_shape': model.input_shape,
  #   'output_shape': model.output_shape,
  # })

  model.compile(optimizer='adam',
                loss='mean_squared_error',
                metrics=['accuracy']
                )

  history = model.fit(x_train, y_train,
    epochs=epochs,
    validation_split=validation_split,
    shuffle=True,
    callbacks=callbacks,
  )

  model.evaluate(x_train, y_train)

  # print('\t'.join(['filters', 'kernel_size', 'units', 'loss', 'val_loss', 'accuracy', 'val_accuracy']))
  # print('\t'.join([str(n) for n in [
  #   filters,
  #   kernel_size,
  #   units,
  #   min(history.history['loss']),
  #   min(history.history['val_loss']),
  #   max(history.history['accuracy']),
  #   max(history.history['val_accuracy']),
  # ]]))

  # plt.title('history')
  # plt.plot(history.epoch, history.history['val_accuracy'], label = 'val_accuracy')
  # plt.plot(history.epoch, history.history['accuracy'], label = 'accuracy')
  # plt.plot(history.epoch, history.history['val_loss'], label = 'val_loss')
  # plt.plot(history.epoch, history.history['loss'], label = 'loss')
  # plt.legend()
  # plt.savefig('data/history.png')


  return model

def loadTrainSet():
  with open('data/trainset.pickle', 'rb') as f:
    return pickle.load(f)

def main():
  trainSet = loadTrainSet()

  model = fit(trainSet)
  model.save('data/benefits.h5')

if __name__ == '__main__':
  main()
