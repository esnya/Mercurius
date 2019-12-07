import React, { useState, useEffect, useRef } from 'react';
import { Container, Segment, CardGroup } from 'semantic-ui-react';
import defaultsDeep from 'lodash/defaultsDeep';
import RecognitionTask, {
  Task,
  Result,
  isValid,
} from '../components/RecognitionTask';
import Ocr from '../utilities/ocr';
import withFirebaseApp, {
  WithFirebaseProps,
} from '../enhancers/withFirebaseApp';
import { isItem } from '../types/Item';
import ActionButton from '../components/ActionButton';
import shortid from 'shortid';
import { formatTimestamp } from '../utilities/format';
import firebase from '../firebase';
import { duration } from 'moment';
import { isPrice } from '../types/Price';
import { ErrorThreshold } from '../components/DiffIcon';
import { succeeded, failed, notice } from '../utilities/sounds';
import _ from 'lodash';
import { useParams } from 'react-router';
import useAsyncEffect from '../hooks/useAsyncEffect';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface RecognitionOptions extends Rect {
  mask: (Rect & { style: string })[];
  fps: number;
  trigger: {
    x: number;
    y: number;
    color: [number, number, number];
    preview: boolean;
  };
}
const defaultRecognitionOptions = {
  x: -0.02,
  y: -0.19,
  width: 0.35,
  height: 0.1,
  mask: [{ style: 'white', x: -0.18, y: -0.005, width: 0.135, height: 0.06 }],
  fps: 10,
  trigger: {
    x: 0.02,
    y: 0.02,
    color: [219, 241, 255],
    preview: false,
  },
};
const optionsKey = 'mercurius-trading:recognition-options';

export default withFirebaseApp<{}>(function AutoInput({
  app,
}: WithFirebaseProps): JSX.Element | null {
  const { projectId } = useParams();
  if (typeof projectId !== 'string') return null;

  const [options] = useState<RecognitionOptions>(
    (): RecognitionOptions => {
      const json = localStorage.getItem(optionsKey);
      return defaultsDeep(
        json ? JSON.parse(json) : {},
        defaultRecognitionOptions,
      );
    },
  );
  const [ocr, setOcr] = useState<Ocr>();
  const [video, setVideo] = useState<HTMLVideoElement>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [names, setNames] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas = canvasRef.current;
  const context = canvas && canvas.getContext('2d');

  useAsyncEffect(async (): Promise<void> => {
    const itemsSnapshot = await app
      .firestore()
      .collection('projects')
      .doc(projectId)
      .collection('items')
      .get();
    const names = itemsSnapshot.docs
      .map(d => d.data())
      .filter(isItem)
      .map(i => i.name);
    setNames(names);
    setOcr(new Ocr(names));
  }, [app]);

  useEffect(() => {
    if (names.length > 0) {
      setOcr(new Ocr(names));
    }
  }, [names]);

  const itemsRef = app
    .firestore()
    .collection('projects')
    .doc(projectId)
    .collection('items');

  async function recognize(ocr: Ocr, image: Blob): Promise<void> {
    const id = shortid();
    const timestamp = formatTimestamp();

    setTasks(tasks => [
      ...tasks,
      {
        id,
        image,
        timestamp,
      },
    ]);

    function updateTask(value: {}): void {
      setTasks(tasks =>
        tasks.map(task => (task.id === id ? _.merge(value, task) : task)),
      );
    }

    const result = await ocr.recognize(image);
    updateTask({ result });

    const { name, value } = result;

    if (!name || !value) {
      console.log('failed to recognize text');
      failed.play();
      return;
    }

    const itemsSnapshot = await itemsRef.where('name', '==', name).get();
    const itemSnapshot = itemsSnapshot.docs[0];
    if (!itemSnapshot) {
      console.log('failed to find item');
      failed.play();
      return;
    }

    const pricesRef = itemSnapshot.ref.collection('prices');
    const pricesSnapshot = await pricesRef
      .orderBy('timestamp', 'desc')
      // .startAt(
      //   moment()
      //     .subtract(1, 'day')
      //     .valueOf(),
      // )
      .limit(1)
      .get();
    const lastPrice = pricesSnapshot.docs.map(d => d.data()).filter(isPrice)[0];

    if (!lastPrice) {
      console.log('failed to find last price');
      failed.play();
      return;
    }

    const fluctuation = value - lastPrice.price;
    const days =
      (Date.now() - lastPrice.timestamp.toMillis()) /
      duration(1, 'day').asMilliseconds();
    const fluctuationPerDay = fluctuation / days;
    const fluctuationRate = fluctuationPerDay / lastPrice.price;

    updateTask({
      result: {
        diffRate: fluctuationRate,
      },
    });

    if (Math.abs(fluctuationRate) > ErrorThreshold) {
      console.log('fluctuation too large');
      failed.play();
      return;
    }

    succeeded.play();
    await pricesRef.add({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      price: value,
      lottery: Boolean(result.drawing),
    });

    setTasks(tasks => tasks.filter(task => task.id !== id));
  }

  useEffect(() => {
    if (!ocr || !video || !canvas || !context) return;

    let prevTriggered = false;
    const renderInterval = setInterval(async () => {
      const { videoWidth: sw, videoHeight: sh } = video;
      const { x, y, width, height, mask, trigger } = options;

      const s = Math.min(sw, sh);
      const dw = s * width;
      const dh = s * height;

      canvas.width = dw;
      canvas.height = dh;

      context.drawImage(
        video,
        (sw - dw) / 2 + s * x,
        (sh - dh) / 2 + s * y,
        dw,
        dh,
        0,
        0,
        dw,
        dh,
      );

      mask.forEach(m => {
        context.fillStyle = m.style;
        context.fillRect(
          dw / 2 + s * m.x,
          dh / 2 + s * m.y,
          s * m.width,
          s * m.height,
        );
      });

      if (trigger.preview) {
        context.strokeStyle = 'red';
        context.ellipse(
          dw / 2 + s * trigger.x,
          dh / 2 + s * trigger.y,
          3,
          3,
          0,
          0,
          360,
        );
        context.stroke();
      }
      const triggerPixel = context.getImageData(
        dw / 2 + s * trigger.x,
        dh / 2 + s * trigger.y,
        1,
        1,
      );
      const triggered =
        trigger.color.reduce(
          (p, c, i) => p + Math.abs(triggerPixel.data[i] - c),
          0,
        ) /
          3 <
        5;
      if (triggered && !prevTriggered) {
        notice.play();
        const image = await new Promise<Blob | null>(r => canvas.toBlob(r));
        if (!image) throw new Error('Failed to get image');
        setTimeout(() => recognize(ocr, image));
      }
      // eslint-disable-next-line require-atomic-updates
      prevTriggered = triggered;
    }, 1000 / options.fps);

    return (): void => clearInterval(renderInterval);
  }, [app, video, canvas, options, ocr]);

  const selectSource = async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia();
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    setVideo(video);
  };

  const taskViews = tasks.map(task => {
    return (
      <RecognitionTask
        task={task}
        key={task.id}
        names={names}
        onSubmit={async (task: Task): Promise<void> => {
          const { result } = task;
          if (!isValid(result)) {
            throw new Error('名前と価格は必須');
          }

          const { value, name, drawing } = result;

          const itemsSnapshot = await itemsRef.where('name', '==', name).get();
          const itemSnapshot = itemsSnapshot.docs[0];
          const itemRef = itemSnapshot ? itemSnapshot.ref : itemsRef.doc(name);

          if (!itemSnapshot) {
            itemRef.set({
              name,
              type: 'item',
            });
          }

          const pricesRef = itemRef.collection('prices');
          await pricesRef.add({
            price: value,
            lottery: Boolean(drawing),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          });

          setTasks(a => a.filter(b => b.id !== task.id));
        }}
        onEdit={(result: Partial<Result>): void =>
          setTasks(a =>
            a.map(b =>
              b.id === task.id
                ? { ...b, result: b.result && { ...b.result, ...result } }
                : b,
            ),
          )
        }
        onDelete={(): void => setTasks(a => a.filter(b => b.id !== task.id))}
      />
    );
  });

  return (
    <Container>
      <Segment>
        <canvas ref={canvasRef} />
        <ActionButton action={selectSource}>画面選択</ActionButton>
      </Segment>
      <CardGroup>{taskViews}</CardGroup>
    </Container>
  );
});
