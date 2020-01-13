import React, { useState } from 'react';
import {
  Accordion,
  StrictAccordionProps,
  StrictAccordionContentProps,
  StrictAccordionTitleProps,
  Icon,
} from 'semantic-ui-react';

interface SimpleAccordionProps extends StrictAccordionProps {
  active?: boolean;
  title: string | JSX.Element;
  titleProps?: StrictAccordionTitleProps;
  contentProps?: StrictAccordionContentProps;
}

export default function SimpleAccordion({
  active: activeInitial,
  children,
  title,
  titleProps,
  contentProps,
  ...props
}: SimpleAccordionProps): JSX.Element {
  const [active, setActive] = useState(activeInitial ?? false);

  return (
    <Accordion {...props}>
      <Accordion.Title
        {...titleProps}
        active={active}
        onClick={(): void => setActive(a => !a)}
      >
        <Icon name="dropdown" />
        {title}
      </Accordion.Title>
      <Accordion.Content {...contentProps} active={active}>
        {children}
      </Accordion.Content>
    </Accordion>
  );
}
