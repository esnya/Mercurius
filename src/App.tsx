import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import Home from './views/Home';
import Recognition from './views/Recognition';
import NotFound from './views/NotFound';
import Analytics from './views/Analytics';

export default function App(): JSX.Element {
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <Home />
        </Route>
        <Route exact path="/analytics">
          <Analytics />
        </Route>
        <Route exact path="/recognition">
          <Recognition />
        </Route>
        <Route path="*">
          <NotFound />
        </Route>
      </Switch>
    </Router>
  );
}
