import React from 'react';
import {
  Card,
  CardContent,
  Image,
  Message,
  CardDescription,
  Form,
  FormInput,
  FormCheckbox,
  Icon,
  Loader,
  Dimmer,
} from 'semantic-ui-react';
import ActionButton from './ActionButton';
import shortid from 'shortid';
import { formatDecimal, formatInteger } from '../utilities/format';

export interface Result {
  name?: string;
  nameCandidates?: { name: string; score: number }[];
  value?: number;
  drawing: boolean;
}

export interface ValidResult {
  name: string;
  value: number;
  drawing: boolean;
}

export function isValid(result?: Result): result is ValidResult {
  if (!result) return false;

  const { name, value } = result;

  if (!name || !value) return false;

  return true;
}

export interface Task {
  id: string;
  image: Blob;
  timestamp: string;
  result?: Result;
  errors?: string[];
}

export interface RecognitionTaskProps {
  task: Task;
  names: string[];
  onEdit: (value: Partial<Result>) => void;
  onDelete: (task: Task) => Promise<void>;
}

const datalistIdPrefix = shortid();

const TaskImage = React.memo(function TaskImage({
  image,
}: {
  image: Blob;
}): JSX.Element {
  return <Image src={URL.createObjectURL(image)} />;
});

const TaskDatalist = React.memo(function TaskDatalist({
  id,
  nameCandidates,
  names,
}: {
  id: string;
  nameCandidates?: { name: string; score: number }[];
  names: string[];
}): JSX.Element {
  const candidateOptions = nameCandidates
    ? nameCandidates.map(({ name, score }) => (
        <option key={name} value={name}>
          {name} ({formatDecimal((1 - score) * 100)}%)
        </option>
      ))
    : null;
  const nameOptions = names.map(name => (
    <option key={name} value={name}>
      {name}
    </option>
  ));
  return (
    <datalist id={id}>
      {candidateOptions}
      {nameOptions}
    </datalist>
  );
});

const TaskForm = React.memo(function TaskForm({
  names,
  task: { result, errors, id },
  onEdit,
}: {
  names: string[];
  task: Task;
  onEdit: (value: Partial<Result>) => void;
}): JSX.Element {
  const loading = Boolean(!result && !errors);
  const datalistId = `${datalistIdPrefix}-${id}`;
  const name = result && result.name;
  const value = result && result.value && formatInteger(result.value);
  const drawing = result && result.drawing;

  return (
    <Form>
      <Dimmer active={loading}>
        <Loader />
      </Dimmer>
      <FormInput
        required
        list={datalistId}
        readonly={loading}
        placeholder="アイテム名"
        loading={loading}
        value={name}
        onChange={(_e, { value }): void => onEdit({ name: value })}
      />
      <TaskDatalist
        id={datalistId}
        names={names}
        nameCandidates={result && result.nameCandidates}
      />
      <FormInput
        required
        placeholder="価格"
        loading={loading}
        readonly={loading}
        value={value}
        onChange={(_e, { value }): void => {
          const n = Number(value.replace(/[^.0-9]/g, ''));
          if (n) onEdit({ value: n || undefined });
        }}
      />
      <FormCheckbox
        label="抽選"
        disabled={loading}
        checked={drawing}
        onClick={(): void => onEdit({ drawing: !drawing })}
      />
    </Form>
  );
});

export default React.memo(function RecognitionTask({
  task,
  names,
  onEdit,
  onDelete,
}: RecognitionTaskProps): JSX.Element {
  const loading = Boolean(!task.result && !task.errors);

  const error = task.errors ? (
    <CardContent>
      <Message negative>
        {task.errors.map((e, i) => (
          <p key={i}>{e}</p>
        ))}
      </Message>
    </CardContent>
  ) : null;
  const name = task.result && task.result.name;
  const value = task.result && task.result.value;

  const icon = loading ? (
    <Loader />
  ) : isValid(task.result) ? (
    <Icon color="green" name="check" />
  ) : (
    <Icon color="red" name="exclamation" />
  );

  return (
    <Card>
      <TaskImage image={task.image} />
      <CardContent>
        <CardDescription>
          {icon}
          {task.timestamp}
        </CardDescription>
      </CardContent>
      <CardContent>
        <CardDescription>
          <TaskForm names={names} task={task} onEdit={onEdit} />
        </CardDescription>
      </CardContent>
      {error}
      <CardContent>
        <ActionButton color="red" action={(): Promise<void> => onDelete(task)}>
          削除
        </ActionButton>
      </CardContent>
    </Card>
  );
});