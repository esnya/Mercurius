import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import AutoInput from './views/project/AutoInput';
import NotFound from './views/NotFound';
import Home from './views/Home';
import Project from './views/project/Project';
import AppMenu from './components/AppMenu';
import Members from './views/project/Members';
import './App.styl';
import AI from './views/project/AI';

export default function App(): JSX.Element {
  return (
    <Router>
      <AppMenu />
      <Switch>
        <Route exact path="/projects/:projectId">
          <Project />
        </Route>
        <Route exact path="/projects/:projectId/members">
          <Members />
        </Route>
        <Route exact path="/projects/:projectId/auto">
          <AutoInput />
        </Route>
        <Route exact path="/projects/:projectId/items/:itemId/ai">
          <AI />
        </Route>
        <Route exact path="/">
          <Home />
        </Route>
        <Route path="*">
          <NotFound />
        </Route>
      </Switch>
    </Router>
  );
}
