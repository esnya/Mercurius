import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import AutoInput from './views/project/AutoInput';
import NotFound from './views/NotFound';
import Home from './views/Home';
import AppMenu from './components/AppMenu';
import ProjectHome from './views/ProjectHome';
import Members from './views/project/Members';
import Item from './views/Item';
import './App.styl';
import { Container } from 'semantic-ui-react';

export default function App(): JSX.Element {
  return (
    <Router>
      <nav>
        <AppMenu />
      </nav>
      <main>
        <Container>
          <Switch>
            <Route exact path="/projects/:projectId">
              <ProjectHome />
            </Route>
            <Route exact path="/projects/:projectId/members">
              <Members />
            </Route>
            <Route exact path="/projects/:projectId/auto">
              <AutoInput />
            </Route>
            <Route exact path="/projects/:projectId/items/:itemId">
              <Item />
            </Route>
            <Route exact path="/">
              <Home />
            </Route>
            <Route path="*">
              <NotFound />
            </Route>
          </Switch>
        </Container>
      </main>
    </Router>
  );
}
