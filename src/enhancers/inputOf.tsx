import React from 'react';
import { FormInput, FormInputProps } from 'semantic-ui-react';
import { ValidateFunction } from 'ajv';
import get from 'lodash/get';
import set from 'lodash/set';
import flatten from 'lodash/flatten';

export type Value = string | number;
export type Data = Readonly<{}>;

export interface InputOptions<V extends Value = string> {
  formatter?: {
    read: (value?: V) => string;
    write: (value: string) => V | undefined;
  };
  label?: string;
  name: string;
  required?: boolean;
  type?: string;
  component?: React.ComponentType<FormInputProps>;
  validator?: ValidateFunction;
}

export interface InputProps<D extends Data = Data>
  extends Omit<FormInputProps, 'value' | 'onChange'> {
  value: Partial<D>;
  onChange: (value: Partial<D>) => void;
}

export default function inputOf<
  V extends Value = string,
  D extends Data = Data
>({
  label,
  name,
  type,
  formatter,
  component,
  validator,
  ...otherOptions
}: InputOptions<V>): React.ComponentType<InputProps<D>> {
  return React.memo<InputProps<D>>(function InputOf({
    error,
    value,
    onChange,
    ...otherProps
  }: InputProps<D>): JSX.Element {
    const validationErrors =
      (validator &&
        !validator(value) &&
        validator.errors &&
        validator.errors
          .filter(error => error.dataPath == `.${name}`)
          .map(error => error.message)) ||
      [];
    const mergedErrors = flatten([validationErrors || [], error || []]);

    const itemValue: V | undefined = get(value, name) as V | undefined;
    const displayValue =
      formatter && itemValue ? formatter.read(itemValue) : itemValue;

    const Component = component || FormInput;

    return (
      <Component
        error={mergedErrors.length > 0 ? mergedErrors : false}
        label={label}
        name={name}
        type={type}
        {...otherOptions}
        {...otherProps}
        value={displayValue || ''}
        onChange={(_event, { value }): void => {
          const valueToWrite = formatter ? formatter.write(value) : value;
          const data = set({}, name, valueToWrite) as Partial<D>;
          onChange(data);
        }}
      />
    );
  });
}
