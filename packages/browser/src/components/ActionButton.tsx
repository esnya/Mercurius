import React, { useState } from 'react';
import { ButtonProps, Button } from 'semantic-ui-react';

export interface ActionButtonProps extends ButtonProps {
  action: () => Promise<void>;
}
export default function ActionButton<E = Error>({
  action,
  onClick,
  ...props
}: ActionButtonProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<E>();

  if (error) {
    throw error;
  }

  const handleClick = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    data: ButtonProps,
  ): void => {
    setLoading(true);

    action()
      .then((): void => onClick && onClick(e, data), setError)
      .then((): void => setLoading(false));
  };

  return <Button {...props} loading={loading} onClick={handleClick} />;
}
