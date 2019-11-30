import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  useRouteMatch,
} from 'react-router-dom';
import Input from './views/Input';
import Recognition from './views/Recognition';
import NotFound from './views/NotFound';
import Analytics from './views/Analytics';
import { Menu, MenuItem } from 'semantic-ui-react';

const menuItems = [
  { path: '/', text: 'ホーム' },
  { path: '/manual', text: '手動入力' },
  { path: '/auto', text: '自動入力' },
];
function AppMenu(): JSX.Element {
  const items = menuItems.map(({ path, text }, i) => {
    const match = useRouteMatch(path);
    const active = match ? match.isExact : false;
    return (
      <MenuItem key={i} as={Link} to={path} active={active}>
        {text}
      </MenuItem>
    );
  });
  return (
    <Menu pointing secondary>
      {items}
    </Menu>
  );
}

export default function App(): JSX.Element {
  return (
    <Router>
      <AppMenu />
      <Switch>
        <Route exact path="/manual">
          <Input />
        </Route>
        <Route exact path="/auto">
          <Recognition />
        </Route>
        <Route exact path="/">
          <Analytics />
        </Route>
        <Route path="*">
          <NotFound />
        </Route>
      </Switch>
    </Router>
  );
}
