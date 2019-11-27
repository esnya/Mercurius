import React from 'react';
import {
  Card,
  CardContent,
  Image,
  Message,
  Loader,
  Dimmer,
  CardDescription,
  CardHeader,
  CardMeta,
} from 'semantic-ui-react';
import { formatNumber } from '../utilities/format';
import ActionButton from './ActionButton';
export interface Task {
  id: string;
  image: Blob;
  timestamp: string;
  result?: {
    name: string;
    value: number;
    drawing: boolean;
  };
  error?: string;
}

export interface RecognitionTaskProps {
  task: Task;
  onDelete: (task: Task) => Promise<void>;
}

export default React.memo(function RecognitionTask({
  task,
  onDelete,
}: RecognitionTaskProps): JSX.Element {
  const loading = Boolean(!task.result && !task.error);

  const error = task.error ? <Message negative>{task.error}</Message> : null;
  const result = task.result ? (
    <div>
      <CardHeader>{task.result.name}</CardHeader>
      <CardMeta>
        {task.timestamp}
        {task.result.drawing ? ' 抽選中' : null}
      </CardMeta>
      <CardDescription>{formatNumber(task.result.value)}</CardDescription>
    </div>
  ) : null;

  return (
    <Card>
      <Image src={URL.createObjectURL(task.image)} />
      <CardContent>
        <Dimmer active={loading}>
          <Loader />
        </Dimmer>
        {result}
        {error}
      </CardContent>
      <CardContent>
        <ActionButton color="red" action={(): Promise<void> => onDelete(task)}>
          削除
        </ActionButton>
      </CardContent>
    </Card>
  );
});
