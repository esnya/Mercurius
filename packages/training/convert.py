from tensorflowjs.converters import save_keras_model
from tensorflow.keras.models import load_model
import re
import json

def convertManifest(manifest):
  paths = manifest['paths']
  newPath = re.sub(r'-[^\.]*', '', paths[0])

  with open('data/model/' + newPath, 'wb') as dst:
    for path in paths:
      with open('data/model_tmp/' + path, 'rb') as src:
        dst.write(src.read())

  manifest['paths'] = [newPath]
  return manifest

def convert():
  model = load_model('data/model.h5')
  save_keras_model(model, 'data/model_tmp')

  with open('data/model_tmp/model.json', 'r') as src:
    model = json.load(src)
    model['weightsManifest'] = [convertManifest(m) for m in model['weightsManifest']]
    with open('data/model/model.json', 'w') as dst:
      json.dump(model, dst)

if __name__ == '__main__':
  convert()
