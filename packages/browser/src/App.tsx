import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import AutoInput from './views/project/AutoInput';
import NotFound from './views/NotFound';
import Home from './views/Home';
import AppMenu from './components/AppMenu';
import Members from './views/project/Members';
import './App.styl';
import { Container, Placeholder } from 'semantic-ui-react';

function RouteLoading(): JSX.Element {
  return (
    <Placeholder>
      <Placeholder.Header />
      <Placeholder.Paragraph />
    </Placeholder>
  );
}

export default function App(): JSX.Element {
  return (
    <Router>
      <nav>
        <AppMenu />
      </nav>
      <main>
        <Container>
          <Suspense fallback={<RouteLoading />}>
            <Switch>
              <Route
                exact
                path="/projects/:projectId"
                component={lazy(() => import('./views/Project'))}
              />
              <Route exact path="/projects/:projectId/members">
                <Members />
              </Route>
              <Route exact path="/projects/:projectId/auto">
                <AutoInput />
              </Route>
              <Route
                exact
                path="/projects/:projectId/items/:itemId"
                component={lazy(() => import('./views/Item'))}
              />
              <Route
                exact
                path="/sign-in"
                component={lazy(() => import('./views/SignIn'))}
              />
              <Route exact path="/">
                <Home />
              </Route>
              <Route path="*">
                <NotFound />
              </Route>
            </Switch>
          </Suspense>
        </Container>
      </main>
    </Router>
  );
}
