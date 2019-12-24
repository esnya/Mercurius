import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Segment,
  CardGroup,
  Modal,
  Button,
} from 'semantic-ui-react';
import defaultsDeep from 'lodash/defaultsDeep';
import RecognitionTask, {
  Task,
  Result,
  isValid,
} from '../../components/RecognitionTask';
import Ocr from '../../utilities/ocr';
import withFirebaseApp, {
  WithFirebaseProps,
} from '../../enhancers/withFirebaseApp';
import { isItem } from '../../types/Item';
import ActionButton from '../../components/ActionButton';
import shortid from 'shortid';
import { formatTimestamp } from '../../utilities/format';
import firebase from '../../firebase';
import { duration } from 'moment';
import { isPrice } from '../../types/Price';
import { ErrorThreshold } from '../../components/DiffIcon';
import { succeeded, failed, notice } from '../../utilities/sounds';
import _ from 'lodash';
import { useParams } from 'react-router';
import useAsyncEffect from '../../hooks/useAsyncEffect';
import { loadPreset, drawPreset } from '../../recognition/RecognitionPreset';
import { bounds, crop, videoToCanvas, Size } from '../../utilities/image';
import RecognitionPresetEditor from '../../components/RecognitionPresetEditor';

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

function useCanvas(size?: Size): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  if (size) {
    canvas.width = size.width;
    canvas.height = size.height;
  }

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Failed to get context');

  return context;
}

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
  const [stream, setStream] = useState<MediaStream>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);

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

  async function recognize(
    ocr: Ocr,
    context: CanvasRenderingContext2D,
  ): Promise<void> {
    const id = shortid();
    const timestamp = formatTimestamp();

    const { canvas } = context;
    const preset = loadPreset();

    const image = await crop(bounds(preset.recognitions), canvas, canvas);

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

    const result = await ocr.recognize(canvas, loadPreset());
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
    const data = {
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      price: value,
      lottery: Boolean(result.drawing),
    };
    await pricesRef.add(data);
    console.log(name, value, Boolean(result.drawing));

    setTasks(tasks => tasks.filter(task => task.id !== id));
  }

  useEffect(() => {
    if (!ocr || !stream || !canvas || !context) return;

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const bufferContext = useCanvas();
    const triggerContext = useCanvas({ width: 1, height: 1 });
    const capture = new ImageCapture(track);
    const preset = loadPreset();
    const { recognitions, triggers, fps } = preset;

    let prevTriggered = false;
    const interval = setInterval(async () => {
      const frame = await capture.grabFrame();

      const { height, width } = frame;
      bufferContext.canvas.width = width;
      bufferContext.canvas.width = height;
      bufferContext.drawImage(frame, 0, 0);

      const scale = 0.5 * height;
      const cx = width / 2;
      const cy = height / 2;

      const triggered = triggers.every((trigger): boolean => {
        const x = trigger.x * scale + cx;
        const y = trigger.y * scale + cy;
        triggerContext.drawImage(frame, x, y, 1, 1, 0, 0, 1, 1);
        const pixel = triggerContext.getImageData(0, 0, 1, 1);
        return trigger.color.every((c, i) => Math.abs(c - pixel.data[i]) < 10);
      });
      if (triggered && !prevTriggered) {
        notice.play();
        const toRecognize = useCanvas({ width, height });
        toRecognize.drawImage(frame, 0, 0);
        setTimeout(() => recognize(ocr, toRecognize));
      }
      prevTriggered = triggered;

      const previewBBox = bounds(
        [
          ...recognitions,
          ...triggers.map(t => ({ ...t, width: 1 / scale, height: 1 / scale })),
        ].map(({ x, y, width, height }) => ({
          x: x * scale + cx,
          y: y * scale + cy,
          width: width * scale,
          height: height * scale,
        })),
      );
      canvas.width = previewBBox.width;
      canvas.height = previewBBox.height;

      context.drawImage(
        frame,
        previewBBox.x,
        previewBBox.y,
        previewBBox.width,
        previewBBox.height,
        0,
        0,
        previewBBox.width,
        previewBBox.height,
      );
      drawPreset(context, preset, {
        x: -previewBBox.x,
        y: -previewBBox.y,
        width,
        height,
      });
    }, 1000 / fps);

    return (): void => {
      clearInterval(interval);
    };
  }, [app, video, canvas, options, ocr]);

  const selectSource = async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia();
    setStream(stream);

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
      <Segment.Group>
        <Segment>
          <canvas ref={canvasRef} />
        </Segment>
        <Segment>
          <Button
            color="blue"
            disabled={!ocr || !video}
            onClick={(): void => {
              if (!ocr || !video) return;
              recognize(ocr, videoToCanvas(video));
            }}
          >
            認識
          </Button>
          <ActionButton action={selectSource} floated="right">
            画面選択
          </ActionButton>
          <Button
            disabled={!stream}
            floated="right"
            onClick={(): void => setEditorOpen(true)}
          >
            設定
          </Button>
        </Segment>
      </Segment.Group>
      <CardGroup>{taskViews}</CardGroup>
      <Modal open={editorOpen} onClose={() => setEditorOpen(false)}>
        <Modal.Content>
          {stream && editorOpen && <RecognitionPresetEditor stream={stream} />}
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={() => setEditorOpen(false)}>閉じる</Button>
        </Modal.Actions>
      </Modal>
    </Container>
  );
});
