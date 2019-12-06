import React from 'react';
import { useRouteMatch, useParams } from 'react-router';
import { MenuItem, Menu } from 'semantic-ui-react';
import SignOutButton from './SignOutButton';
import { Link } from 'react-router-dom';

const menuItems = [
  { path: '/', text: 'ホーム' },
  { path: '/manual', text: '手動入力' },
  { path: '/auto', text: '自動入力' },
];

export default function AppMenu(): JSX.Element {
  const { projectId } = useParams();
  const items = menuItems.map(({ path, text }, i) => {
    const match = useRouteMatch(path);
    const active = match ? match.isExact : false;
    const to = `/projects/${projectId}${path}`;
    return (
      <MenuItem key={i} as={Link} to={to} active={active}>
        {text}
      </MenuItem>
    );
  });
  return (
    <Menu pointing secondary>
      {items}
      <MenuItem position="right">
        <SignOutButton />
      </MenuItem>
    </Menu>
  );
}
