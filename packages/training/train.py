import matplotlib.pyplot as plt
import numpy as np
import pickle
import matplotlib.pyplot as plt
import tensorflow as tf

def fit(trainSet):
  x_train = np.array([x.values for (x, y) in trainSet])
  y_train = np.array([y.values for (x, y) in trainSet])

  filters = 2 ** 5
  kernel_size = 2 ** 5
  units = 2 ** 12
  epochs = 20

  model = tf.keras.models.Sequential([
    tf.keras.layers.Flatten(input_shape=x_train.shape[1:]),
    tf.keras.layers.Reshape(target_shape=(x_train.shape[1] * x_train.shape[2], 1)),
    tf.keras.layers.Conv1D(filters=filters, kernel_size=kernel_size, padding='same'),
    tf.keras.layers.Conv1D(filters=filters, kernel_size=kernel_size, padding='same'),
    tf.keras.layers.Conv1D(filters=filters, kernel_size=kernel_size, padding='same'),
    # tf.keras.layers.Conv1D(filters=filters, kernel_size=kernel_size, padding='causal'),
    tf.keras.layers.Flatten(),
    tf.keras.layers.Dense(units, activation='relu'),
    tf.keras.layers.Dense(units, activation='relu'),
    tf.keras.layers.Dense(units, activation='relu'),
    tf.keras.layers.Dense(y_train.shape[1] * y_train.shape[2]),
    tf.keras.layers.Reshape(target_shape=y_train.shape[1:]),
  ])
  model.summary()
  print({
    'input_shape': model.input_shape,
    'output_shape': model.output_shape,
  })

  model.compile(optimizer='adam',
                loss='mean_squared_error',
                metrics=['accuracy'])

  history = model.fit(x_train, y_train,
    epochs=epochs,
    validation_split=0.5,
    shuffle=True,
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
