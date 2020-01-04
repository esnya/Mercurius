import _ from 'lodash';
import * as tf from '@tensorflow/tfjs';
import * as tfvis from '@tensorflow/tfjs-vis';
import { Price } from 'mercurius-core/lib/models/Price';
import { Duration } from 'luxon';
import { safeLoad } from 'js-yaml';
import ajv, { ValidateFunction } from 'ajv';
import { isDefined } from './types';
