import tensorflowjs as tfjs
import tensorflow as tf

def convert():
  model = tf.keras.models.load_model('data/benefits.h5')
  tfjs.converters.save_keras_model(model, '../functions/data/benefits')

if __name__ == '__main__':
  convert()