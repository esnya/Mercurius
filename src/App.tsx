import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import Home from './views/Home';
import Recognition from './views/Recognition';
import NotFound from './views/NotFound';
import { GridColumn, Grid } from 'semantic-ui-react';

export default function App(): JSX.Element {
  return (
    <Grid
      textAlign="center"
      style={{ minHeight: '100vh' }}
      verticalAlign="middle"
    >
      <GridColumn textAlign="left">
        <Router>
          <Switch>
            <Route exact path="/">
              <Home />
            </Route>
            <Route exact path="/recognition">
              <Recognition />
            </Route>
            <Route path="*">
              <NotFound />
            </Route>
          </Switch>
        </Router>
      </GridColumn>
    </Grid>
  );
}
