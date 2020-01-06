import React, { useState, useEffect, useMemo } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-yaml';
import { safeLoad, safeDump } from 'js-yaml';
import _ from 'lodash';
import { Message } from 'semantic-ui-react';

const parse = safeLoad;
const stringify = _.partialRight(safeDump, { indent: 2 });
const language = languages.yaml;

export interface ConfigurationEditorProps<T, U extends Partial<T>> {
  value: T;
  validate: <U>(value: U) => void;
  onChange: (newValue: T) => void;
}

export default function ConfigurationEditor<T, U extends Partial<T>>({
  value,
  validate,
  onChange,
}: ConfigurationEditorProps<T, U>): JSX.Element {
  const valueString = stringify(value);
  const [code, setCode] = useState((): string => {
    try {
      return valueString;
    } catch (error) {
      console.log(error);
      return '';
    }
  });
  const [errors, setErrors] = useState<string[]>();

  useEffect((): void => {
    try {
      if (valueString === stringify(parse(code))) return;
      setCode(valueString);
      setErrors(undefined);
    } catch (e) {
      setErrors([e.toString()]);
    }
  }, [valueString]);

  const handleChange = (newCode: string): void => {
    try {
      const newValue = parse(newCode);
      validate(newValue);
      setErrors(undefined);
      onChange(newValue);
    } catch (error) {
      setErrors([error.toString()]);
    }
  };

  const debouncedHandleChange = useMemo(
    () => _.debounce(handleChange, 500),
    [],
  );

  const errorMessages = errors
    ? errors.map((error, i) => (
        <Message key={i} negative>
          <Message.Content>{error}</Message.Content>
        </Message>
      ))
    : null;

  return (
    <div>
      <Editor
        highlight={(code): React.ReactNode => highlight(code, language, 'yaml')}
        style={{ fontFamily: 'monospace' }}
        tabSize={2}
        value={code}
        onValueChange={(newValue: string): void => {
          setCode(newValue);
          debouncedHandleChange(newValue);
        }}
        onBlur={() => handleChange(code)}
      />
      {errorMessages}
    </div>
  );
}
