import React from 'react';
import {
  Form,
  Checkbox,
  FormInputProps,
  CheckboxProps,
  FormField,
  Message,
} from 'semantic-ui-react';
import shortid from 'shortid';
import moment from 'moment';
import { index, Bucket } from '../elasticsearch';
import { withESQuery, ChildProps } from '../enhancers/withESQuery';
import inputOf from '../enhancers/inputOf';
import formatter from 'format-number';

const ValueTTL = 1000 * 60 * 60 * 3;

function Toggle({ label, ...props }: CheckboxProps): JSX.Element {
  return (
    <FormField>
      <label>{label}</label>
      <Checkbox {...props} toggle />
    </FormField>
  );
}

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
});

const ValueInput = inputOf({
  formatter: {
    read: (value): string => formatter()(Number(value)),
    write: (value): string => value.replace(/[^0-9]+/g, ''),
  },
  pattern: /^[0-9,]+$/,
  label: 'アイテム名',
  name: 'value',
  required: true,
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
  name: string;
  value: string;
  drawing: boolean;
}

export default withESQuery(
  'rom_trading',
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
        name: '',
        value: '',
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

    get datalist(): { label: string; value: string }[] {
      const t = Date.now() - ValueTTL;
      return this.names.map(b => {
        const value = b.key;

        return {
          value,
          label: `${value} (${
            b.maxTimestamp.value < t ? 'outdated' : 'up to date'
          }`,
        };
      });
    }

    get timestamp(): string {
      return moment(
        this.state.autoTimestamp
          ? new Date()
          : new Date(`${this.state.date} ${this.state.time} `),
      ).format('Y/MM/DD HH:mm:ss');
    }

    get errors(): string[] {
      const errors: string[] = [];
      try {
        this.timestamp;
      } catch (e) {
        errors.push('不正なタイムスタンプ');
      }

      const { allowNewName, name, value } = this.state;

      if (!(Number(value) > 0)) {
        errors.push('価格は0より大きい数値');
      }

      if (!(name && (allowNewName || this.names.find(a => a.key === name)))) {
        errors.push('不正なアイテム名');
      }

      return errors;
    }

    private async onAdd(): Promise<void> {
      const { timestamp, state, errors } = this;

      if (errors.length > 0) return;

      const { name, value, drawing } = state;

      const res = await index('rom_trading', {
        name,
        value: Number(value),
        drawing,
        timestamp,
      });
      console.log(res);
      this.props.update();

      this.setState(
        {
          name: '',
          value: '',
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
      const nameOptions = this.datalist.map(({ label, value }) => (
        <option key={value} value={value} label={label} />
      ));

      const errorMessages =
        this.errors.length > 0 ? (
          <Message negative>
            {this.errors.map((error, key) => (
              <p key={key}>{error}</p>
            ))}
          </Message>
        ) : null;

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
            list={this.datalistId}
            value={this.state}
            onChange={(value): void => this.setState(value)}
          >
            <input ref={this.nameRef} />
          </NameInput>
          <datalist id={this.datalistId}>{nameOptions}</datalist>
          <ValueInput
            value={this.state}
            onChange={(value): void => this.setState(value)}
          />
          <Toggle
            label="抽選中"
            checked={this.state.drawing}
            onClick={(): void =>
              this.setState({ drawing: !this.state.drawing })
            }
          />
          {errorMessages}
          <Form.Button
            color="blue"
            disabled={this.errors.length > 0}
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
