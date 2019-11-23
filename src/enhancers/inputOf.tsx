import React from 'react';
import { FormInput, FormInputProps } from 'semantic-ui-react';

export type Value<N extends string> = Record<N, string>;
export interface InputOptions<N extends string> {
  formatter?: {
    read: (value: string) => string;
    write: (value: string) => string | undefined;
  };
  label?: string;
  name: N;
  pattern?: RegExp;
  required?: boolean;
  type?: string;
  component?: React.ComponentType<FormInputProps>;
}

export interface InputProps<N extends string>
  extends Omit<FormInputProps, 'value' | 'onChange'> {
  value: Partial<Value<N>>;
  onChange: (value: Value<N>) => void;
}

export default function inputOf<N extends string = string>({
  label,
  name,
  type,
  pattern,
  formatter,
  component,
  ...otherOptions
}: InputOptions<N>): React.ComponentType<InputProps<N>> {
  return React.memo<InputProps<N>>(function Input({
    value,
    onChange,
    ...otherProps
  }: InputProps<N>): JSX.Element {
    const itemValue: string | undefined = value[name];
    const displayValue =
      formatter && itemValue ? formatter.read(itemValue) : itemValue;
    const Component = component || FormInput;
    return (
      <Component
        {...otherOptions}
        {...otherProps}
        label={label || name}
        name={name}
        type={type}
        value={displayValue}
        onChange={(_event, { value }): void => {
          const valueToWrite = formatter ? formatter.write(value) : value;
          if (!pattern || !valueToWrite || pattern.test(valueToWrite)) {
            onChange({ [name]: valueToWrite } as Value<N>);
          }
        }}
      />
    );
  });
}
