import matplotlib.pyplot as plt
import numpy as np
import pickle
import matplotlib.pyplot as plt
import tensorflow as tf

def fit(trainSet):

  x_train = np.array([x.values for (x, y) in trainSet])
  y_train = np.array([y.values for (x, y) in trainSet])

  # plt.plot(x_train[200,:,0], label='train_price')
  # plt.plot(x_train[200,:,1], label='train_lottery')
  # plt.plot(y_train[200,:,0], label='train_divestment')
  # plt.plot(y_train[200,:,1], label='train_purchase')
  # plt.legend()
  # plt.show()

  model = tf.keras.models.Sequential([
    tf.keras.layers.Flatten(input_shape=x_train.shape[1:]),
    tf.keras.layers.Reshape(target_shape=(x_train.shape[1] * x_train.shape[2], 1)),
    tf.keras.layers.Conv1D(filters=20, kernel_size=8, padding='causal'),
    tf.keras.layers.Conv1D(filters=20, kernel_size=8, padding='causal'),
    # tf.keras.layers.Conv1D(filters=20, kernel_size = 8),
    tf.keras.layers.Flatten(),
    # tf.keras.layers.Dense(128, activation='relu'),
    # tf.keras.layers.Dropout(0.2),
    # tf.keras.layers.Dense(y_train.shape[1] * y_train.shape[2], activation='softmax'),
    # tf.keras.layers.Dense(500, activation='relu'),
    tf.keras.layers.Dense(2500, activation='relu'),
    tf.keras.layers.Dense(2500, activation='relu'),
    # tf.keras.layers.Dense(2000, activation='relu'),
    tf.keras.layers.Dense(y_train.shape[1] * y_train.shape[2], activation='softmax'),
    tf.keras.layers.Reshape(target_shape=y_train.shape[1:]),
  ])
  model.summary()

  model.compile(optimizer='adam',
                loss='mean_squared_error',
                metrics=['accuracy'])

  history = model.fit(x_train, y_train,
    epochs=10,
    validation_split=0.5,
    shuffle=True,
  )

  plt.title('history')
  plt.plot(history.epoch, history.history['val_accuracy'], label = 'val_accuracy')
  plt.plot(history.epoch, history.history['accuracy'], label = 'accuracy')
  plt.plot(history.epoch, history.history['val_loss'], label = 'val_loss')
  plt.plot(history.epoch, history.history['loss'], label = 'loss')
  plt.legend()
  plt.savefig('data/history.png')
  # model.evaluate(x_train, y_train)

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
