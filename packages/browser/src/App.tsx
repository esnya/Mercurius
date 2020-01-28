import React, { lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useRouteMatch,
} from 'react-router-dom';
import NotFound from './views/NotFound';
import Home from './views/Home';
import AppMenu from './components/AppMenu';
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

function Project(): JSX.Element {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route
        exact
        path={`${path}/members`}
        component={lazy(() => import('./views/project/Members'))}
      />
      <Route
        exact
        path={`${path}/auto`}
        component={lazy(() => import('./views/project/AutoInput'))}
      />
      <Route
        exact
        path={`${path}/items/:itemId`}
        component={lazy(() => import('./views/Item'))}
      />
      <Route component={lazy(() => import('./views/Project'))} />
    </Switch>
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
              <Route path="/projects/:projectId" component={Project} />
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
