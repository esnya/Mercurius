
import tensorflow as tf
from matplotlib import rcParams

def init():
  gpus = tf.config.experimental.list_physical_devices('GPU')
  for gpu in gpus:
        tf.config.experimental.set_memory_growth(gpu, True)

  rcParams['font.family'] = 'sans-serif'
  rcParams['font.sans-serif'] = ['Hiragino Maru Gothic Pro', 'Yu Gothic', 'Meirio', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP']

init()
