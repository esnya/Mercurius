import React from 'react';
import { render } from 'react-dom';
import 'semantic-ui-css/semantic.css';
import App from './components/App';
import moment from 'moment';

const div = document.createElement('div');
div.id = 'app';
document.body.appendChild(div);

render(<App />, div);
