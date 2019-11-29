import React from 'react';
import {
  Form,
  Checkbox,
  FormInputProps,
  CheckboxProps,
  FormField,
} from 'semantic-ui-react';
import shortid from 'shortid';
import moment from 'moment';
import { index, Bucket } from '../elasticsearch';
import { withESQuery, ChildProps } from '../enhancers/withESQuery';
import inputOf from '../enhancers/inputOf';
import Ajv from 'ajv';
import RecordCreation from '../schemas/RecordCreation.schema.yml';
import { formatTimestamp, formatNumber } from '../utilities/format';

const ValueTTL = 1000 * 60 * 60 * 3;

function Toggle({ label, ...props }: CheckboxProps): JSX.Element {
  return (
    <FormField>
      <label>{label}</label>
      <Checkbox {...props} toggle />
    </FormField>
  );
}
const validate = new Ajv().compile(RecordCreation);
const validator = validate;

const DateInput = inputOf({
  required: true,
  label: '日付',
  name: 'date',
  type: 'date',
});
const TimeInput = inputOf({
  required: true,
  label: '時間',
  name: 'time',
  type: 'time',
});

const NameInput = inputOf({
  required: true,
  label: 'アイテム名',
  name: 'name',
  validator,
});

const ValueInput = inputOf<number>({
  formatter: {
    read: (a?: number): string => `${a}`,
    write: (b: string): number | undefined => Number(b),
  },
  name: 'value',
  type: 'number',
  required: true,
  validator,
});

interface TimestampValue {
  autoTimestamp: boolean;
  date: string;
  time: string;
}

interface TimestampInputProps
  extends Omit<FormInputProps, 'value' | 'onChange'> {
  value: Partial<TimestampValue>;
  onChange: (value: Partial<TimestampValue>) => void;
}

const TimestampInput = React.memo<TimestampInputProps>(function TimestampInput({
  onChange,
  value,
  ...props
}: TimestampInputProps) {
  const disabled = value.autoTimestamp;
  return (
    <Form.Group>
      <DateInput
        {...props}
        disabled={disabled}
        value={value}
        onChange={(value): void => {
          if (!disabled) {
            onChange(value);
          }
        }}
      />
      <TimeInput
        {...props}
        disabled={disabled}
        value={value}
        onChange={(value): void => {
          if (!disabled) {
            onChange(value);
          }
        }}
      />
      <Toggle
        label="自動"
        checked={value.autoTimestamp}
        onClick={(): void => onChange({ autoTimestamp: !value.autoTimestamp })}
      />
    </Form.Group>
  );
});

interface State {
  allowNewName: boolean;
  autoTimestamp: boolean;
  date: string;
  time: string;
  name?: string;
  value?: number;
  drawing: boolean;
}

export default withESQuery(
  'mercurius-trading',
  {
    size: 0,
    aggs: {
      names: {
        terms: {
          field: 'name.keyword',
          size: 10000,
          order: {
            maxTimestamp: 'desc',
          },
        },
        aggs: {
          maxTimestamp: {
            max: {
              field: 'timestamp',
            },
          },
        },
      },
      maxTimestamp: {
        max: {
          field: 'timestamp',
        },
      },
    },
  },
  5 * 1000,
)(
  class AddForm extends React.Component<ChildProps, State> {
    constructor(props: ChildProps) {
      super(props);

      this.state = {
        allowNewName: false,
        autoTimestamp: true,
        date: moment().format('Y-MM-DD'),
        time: moment().format('HH:mm'),
        name: undefined,
        value: undefined,
        drawing: false,
      };
    }

    private nameRef = React.createRef<HTMLInputElement>();
    readonly datalistId = shortid();

    get names(): Bucket[] {
      const t = Date.now() - ValueTTL;
      const { buckets } = this.props.value.aggregations.names;
      const index = buckets.findIndex(b => b.maxTimestamp.value < t);

      if (index <= 0) return buckets;

      return [...buckets.slice(index), ...buckets.slice(0, index)];
    }

    get datalist(): { color: string | null; value: string }[] {
      const t = Date.now() - ValueTTL;
      return this.names.map(b => {
        const value = b.key;

        return {
          value,
          color: b.maxTimestamp.value < t ? 'red' : null,
        };
      });
    }

    get timestamp(): string {
      return formatTimestamp(
        this.state.autoTimestamp
          ? new Date()
          : new Date(`${this.state.date} ${this.state.time} `),
      );
    }
    get nameExists(): boolean {
      const { name } = this.state;
      return Boolean(this.names.find(({ key }): boolean => key === name));
    }

    get valid(): boolean {
      return (
        validate(this.state) === true &&
        (this.state.allowNewName || this.nameExists)
      );
    }

    private async onAdd(): Promise<void> {
      const { timestamp, state, valid } = this;

      if (!valid) return;

      const { name, value, drawing } = state;

      const res = await index('mercurius-trading', {
        name,
        value: Number(value),
        drawing,
        timestamp,
      });
      console.log(res);
      this.props.update();

      this.setState(
        {
          allowNewName: false,
          name: undefined,
          value: undefined,
          drawing: false,
        },
        () => {
          if (this.nameRef.current) {
            this.nameRef.current.focus();
          }
        },
      );
    }

    shouldComponentUpdate(
      { value: next }: ChildProps,
      nextState: State,
    ): boolean {
      return (
        this.props.value.aggregations.maxTimestamp.value !==
          next.aggregations.maxTimestamp.value ||
        JSON.stringify(this.state) !== JSON.stringify(nextState)
      );
    }

    render(): JSX.Element {
      const { nameExists, state, valid } = this;
      const { allowNewName, name } = state;

      const nameOptions = this.datalist.map(
        ({ color, value }): JSX.Element => (
          <option className={color || undefined} key={value} value={value} />
        ),
      );

      const nameErrors =
        name && !allowNewName && !nameExists ? ['アイテムが存在しません'] : [];

      const numberValue = Number(this.state.value);
      const valueLabel = numberValue
        ? `価格 ${formatNumber(numberValue)} Zeny`
        : '価格';

      const onChange = (value: Partial<State>): void =>
        this.setState(value as State);

      return (
        <Form>
          <TimestampInput
            value={this.state}
            onChange={(value): void => this.setState(value as State)}
          />
          <Toggle
            checked={this.state.allowNewName}
            label="新しいアイテム名を追加"
            onClick={(): void =>
              this.setState({ allowNewName: !this.state.allowNewName })
            }
          />
          <NameInput
            error={nameErrors}
            list={this.datalistId}
            value={this.state}
            onChange={onChange}
          >
            <input ref={this.nameRef} />
          </NameInput>
          <datalist id={this.datalistId}>{nameOptions}</datalist>
          <ValueInput
            label={valueLabel}
            value={this.state}
            onChange={onChange}
          />
          <Toggle
            label="抽選中"
            checked={this.state.drawing}
            onClick={(): void =>
              this.setState({ drawing: !this.state.drawing })
            }
          />
          <Form.Button
            color="blue"
            disabled={!valid}
            fluid
            onClick={(): Promise<void> => this.onAdd()}
          >
            追加
          </Form.Button>
        </Form>
      );
    }
  },
);
