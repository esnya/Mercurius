import React, { ChangeEvent } from 'react';
import { Form, Checkbox } from 'semantic-ui-react';
import shortid from 'shortid';
import moment from 'moment';
import { index, Bucket } from '../elasticsearch';
import { withESQuery, Props } from '../enhancers/withESQuery';

interface State {
  inputTimestamp: boolean;
  date: string;
  time: string;
  name: string;
  value: string;
  drawing: boolean;
}

const ValueTTL = 1000 * 60 * 60 * 3;

export default withESQuery({
  index: 'rom_trading',
  body: {
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
    },
  },
  watch: 5 * 1000,
})(
  class AddForm extends React.Component<Props, State> {
    constructor(props: Props) {
      super(props);

      this.state = {
        inputTimestamp: false,
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
      const { buckets } = this.props.result.aggregations.names;
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
          })`,
        };
      });
    }

    private async add(value: State): Promise<void> {
      const timestamp = moment(
        this.state.inputTimestamp
          ? new Date(`${this.state.date} ${this.state.time}`)
          : new Date(),
      ).format('Y/MM/DD HH:mm:ss');

      const res = await index('rom_trading', {
        ...value,
        value: Number(value.value.replace(/[^0-9]/g, '')),
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

    render(): JSX.Element {
      const timestampInput = this.state.inputTimestamp ? (
        <Form.Group>
          <Form.Input
            required
            label="date"
            type="date"
            value={this.state.date}
            onChange={(e: ChangeEvent, { value }: { value: string }) =>
              this.setState({ date: value || '' })
            }
          />
          <Form.Input
            required
            label="time"
            type="time"
            value={this.state.time}
            onChange={(e: ChangeEvent, { value }: { value: string }) =>
              this.setState({ time: value || '' })
            }
          />
        </Form.Group>
      ) : null;

      const nameOptions = this.datalist.map(({ label, value }) => (
        <option key={value} value={value} label={label} />
      ));

      return (
        <Form>
          <Checkbox
            label="input timestamp"
            checked={this.state.inputTimestamp}
            onChange={() =>
              this.setState({ inputTimestamp: !this.state.inputTimestamp })
            }
          />
          {timestampInput}
          <Form.Input
            required
            label="name"
            type="string"
            list={this.datalistId}
            value={this.state.name}
            onChange={(e, { value }) => this.setState({ name: value || '' })}
          >
            <input ref={this.nameRef} />
          </Form.Input>
          <datalist id={this.datalistId}>{nameOptions}</datalist>
          <Form.Input
            required
            label="value"
            type="number"
            value={this.state.value || ''}
            onChange={e => this.setState({ value: e.target.value })}
          />
          <Checkbox
            label="drawing"
            control="input"
            checked={this.state.drawing}
            onChange={() => this.setState({ drawing: !this.state.drawing })}
          />
          <Form.Button onClick={() => this.add(this.state)}>Add</Form.Button>
        </Form>
      );
    }
  },
);
