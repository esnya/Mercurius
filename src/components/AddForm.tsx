import React from 'react';
import { Form, Checkbox } from 'semantic-ui-react';
import shortid from 'shortid';
import moment from 'moment';
import { index } from '../elasticsearch';
import { withESQuery, Props } from '../enhancers/withESQuery';

interface State {
  inputTimestamp: boolean;
  date: string;
  time: string;
  name: string;
  value: number | null;
  drawing: boolean;
}

export default withESQuery({
  index: 'rom_trading',
  body: {
    size: 0,
    aggs: {
      names: {
        terms: {
          size: 10000,
          field: 'name.keyword',
        },
      },
    },
  },
})(
  class AddForm extends React.Component<Props, State> {
    constructor(props: Props) {
      super(props);

      this.state = {
        inputTimestamp: false,
        date: moment().format('Y-MM-DD'),
        time: moment().format('HH:mm'),
        name: '',
        value: 0,
        drawing: false,
      };
    }

    private nameRef = React.createRef<HTMLInputElement>();
    readonly datalistId = shortid();

    private async add(value: State): Promise<void> {
      const timestamp = moment(
        this.state.inputTimestamp
          ? new Date(`${this.state.date} ${this.state.time}`)
          : new Date(),
      ).format('Y/MM/DD HH:mm:ss');

      const res = await index('rom_trading', {
        ...value,
        timestamp,
      });
      console.log(res);

      this.setState({
        name: '',
        value: null,
        drawing: false,
      });

      console.log(this.nameRef);
      if (this.nameRef.current) {
        this.nameRef.current.focus();
      }
    }

    render(): JSX.Element {
      const names = this.props.result.aggregations.names.buckets.map(
        ({ key }) => key,
      );

      const timestampInput = this.state.inputTimestamp ? (
        <Form.Group>
          <Form.Input
            required
            label="date"
            type="date"
            value={this.state.date}
            onChange={(e, { value }) => this.setState({ date: value || '' })}
          />
          <Form.Input
            required
            label="time"
            type="time"
            value={this.state.time}
            onChange={(e, { value }) => this.setState({ time: value || '' })}
          />
        </Form.Group>
      ) : null;
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
          <datalist id={this.datalistId}>
            {names.map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <Form.Input
            required
            label="value"
            type="number"
            value={this.state.value || ''}
            onChange={(e, { value }) => this.setState({ value: Number(value) })}
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
