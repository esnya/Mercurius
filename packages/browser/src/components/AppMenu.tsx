import React from 'react';
import { useRouteMatch } from 'react-router';
import { MenuItem, Menu } from 'semantic-ui-react';
import { Link } from 'react-router-dom';

const menuItems = [
  { path: '/', text: 'プロジェクト' },
  { path: '/members', text: 'メンバー' },
  { path: '/auto', text: '自動入力' },
];

export default function AppMenu(): JSX.Element {
  const projectMatched = useRouteMatch<{ projectId?: string }>(
    '/projects/:projectId',
  );
  const projectId = projectMatched && projectMatched.params.projectId;

  const items = menuItems.map(({ path, text }, i) => {
    const to = `/projects/${projectId}${path}`;
    const match = useRouteMatch(to);
    const active = match ? match.isExact : false;
    return (
      <MenuItem key={i} as={Link} to={to} active={active}>
        {text}
      </MenuItem>
    );
  });

  const m = useRouteMatch('/');
  return (
    <Menu pointing secondary>
      <MenuItem as={Link} to="/" active={m ? m.isExact : false}>
        ホーム
      </MenuItem>
      {items}
    </Menu>
  );
}
