import React from 'react';
import {
  Container,
  Segment,
  TextArea,
  CardGroup,
  Card,
  CardContent,
} from 'semantic-ui-react';
import shortid from 'shortid';
import { ChildProps, withESQuery } from '../enhancers/withESQuery';
import defaultsDeep from 'lodash/defaultsDeep';
import { index, search } from '../elasticsearch';
import ActionButton from '../components/ActionButton';
import RecognitionTask, {
  Task,
  Result,
  isValid,
} from '../components/RecognitionTask';
import { formatTimestamp } from '../utilities/format';
import Ocr from '../utilities/ocr';
import Decision22 from '../assets/decision22.mp3';
import Decision24 from '../assets/decision24.mp3';
import Warning1 from '../assets/warning1.mp3';
import { ErrorThreshold } from '../components/DiffIcon';
import moment from 'moment';

interface State {
  video?: HTMLVideoElement;
  context?: CanvasRenderingContext2D;
  options: RecognitionOptions;
  tasks: Task[];
}

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

export default withESQuery('mercurius-trading', {
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
})(
  class Recognition extends React.Component<ChildProps, State> {
    constructor(props: ChildProps) {
      super(props);

      const options = localStorage.getItem(optionsKey);

      this.state = {
        options: defaultsDeep(
          options ? JSON.parse(options) : {},
          defaultRecognitionOptions,
        ),
        tasks: [],
      };

      this.ocr = new Ocr(this.names);

      let prevTriggered = false;
      this.renderInterval = setInterval(() => {
        const canvas = this.canvasRef.current;
        const { context, video } = this.state;
        if (!canvas || !context || !video) return;

        const { videoWidth: sw, videoHeight: sh } = video;
        const { x, y, width, height, mask, trigger } = this.options;

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
          setTimeout(() => {
            this.recognize();
          });
        }
        prevTriggered = triggered;
      }, 1000 / this.state.options.fps);
    }

    renderInterval: ReturnType<typeof setInterval>;
    ocr: Ocr;
    canvasRef = React.createRef<HTMLCanvasElement>();

    async recognize(): Promise<void> {
      this.playSound('triggered');
      const canvas = this.canvasRef.current;
      if (!canvas) throw new Error('Failed to get canvas');

      const image = await new Promise<Blob | null>(r => canvas.toBlob(r));
      if (!image) throw new Error('Failed to get image');

      const id = shortid();

      const timestamp = formatTimestamp();

      this.setState(({ tasks }) => ({
        tasks: [
          {
            id,
            image,
            timestamp,
          },
          ...tasks.filter(t => t.id !== id),
        ],
      }));

      const updateTask = (task: Partial<Task> & { id: string }): void => {
        this.setState(({ tasks }) => ({
          tasks: tasks.map(t => (t.id === id ? { ...t, ...task } : t)),
        }));
      };

      setTimeout(async () => {
        try {
          const result = await this.ocr.recognize(image, this.names);
          updateTask({ id, result });

          const {
            aggregations: {
              filtered: {
                avg: { value: prevValue },
              },
            },
          } = (await search('mercurius-trading', {
            size: 0,
            aggs: {
              filtered: {
                filter: {
                  bool: {
                    must: {
                      match: {
                        'name.keyword': name,
                      },
                    },
                    filter: {
                      range: {
                        timestamp: {
                          gt: moment()
                            .subtract(1, 'days')
                            .milliseconds(),
                        },
                      },
                    },
                  },
                },
                aggs: {
                  avg: {
                    avg: {
                      field: 'value',
                    },
                  },
                },
              },
            },
          } as any)) as any;

          const diffRate =
            result && result.value && prevValue
              ? (result.value - prevValue) / result.value
              : undefined;

          updateTask({
            id,
            result: {
              ...result,
              diffRate,
            },
          });

          if (diffRate && Math.abs(diffRate) > 0.5) {
            throw new Error('Difference too big');
          }

          if (diffRate !== undefined && isValid(result)) {
            await index('mercurius-trading', {
              timestamp,
              name: result.name,
              value: result.value,
              drawing: result.drawing,
            });
            await this.setState(({ tasks }) => ({
              tasks: tasks.filter(t => t.id !== id),
            }));
            this.playSound('succeeded');
          } else {
            this.playSound('failed');
          }
        } catch (error) {
          updateTask({ id, errors: [error.toString()] });
          this.playSound('failed');
        }
      });
    }

    get options(): RecognitionOptions {
      return this.state.options;
    }

    set options(options: RecognitionOptions) {
      this.setState({ options }, () => {
        localStorage.setItem(optionsKey, JSON.stringify(options));
      });
    }

    get names(): string[] {
      return this.props.value.aggregations.names.buckets.map(({ key }) => key);
    }

    soundRefs = {
      triggered: React.createRef<HTMLVideoElement>(),
      succeeded: React.createRef<HTMLVideoElement>(),
      failed: React.createRef<HTMLVideoElement>(),
    };

    playSound(type: keyof Recognition['soundRefs']): void {
      const audio = this.soundRefs[type].current;
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      audio.play();
    }

    componentWillUnmount(): void {
      clearInterval(this.renderInterval);
      const { video } = this.state;
      if (video) video.remove();
    }

    render(): JSX.Element {
      const onSubmit = async (): Promise<void> => {
        await Promise.all(
          this.state.tasks.map(
            async (task): Promise<void> => {
              const { result } = task;
              if (!isValid(result)) return;

              const { name, value, drawing } = result;

              await index('mercurius-trading', {
                timestamp: task.timestamp,
                name,
                value,
                drawing,
              });
            },
          ),
        );
        this.setState({ tasks: [] });
      };

      const onRecognize = async (): Promise<void> => this.recognize();

      const onTaskEdit = ({ id }: Task, value: Partial<Result>): void => {
        this.setState(({ tasks }) => ({
          tasks: tasks.map(task =>
            task.id === id && task.result
              ? { ...task, result: { ...task.result, ...value } }
              : task,
          ),
        }));
      };

      const onTaskDelete = ({ id }: Task): Promise<void> =>
        new Promise(resolve =>
          this.setState(
            ({ tasks }) => ({
              tasks: tasks.filter(t => t.id !== id),
            }),
            resolve,
          ),
        );

      const onSelectSource = async (): Promise<void> => {
        if (this.state.video) this.state.video.remove();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        const canvas = this.canvasRef.current;
        if (!canvas) throw new Error('Failed to get canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Failed to get context');

        await new Promise(resolve =>
          this.setState({ video, context }, resolve),
        );
      };

      const tasks = this.state.tasks.map(task => (
        <RecognitionTask
          key={task.id}
          names={this.names}
          task={task}
          onEdit={(value): void => onTaskEdit(task, value)}
          onDelete={onTaskDelete}
        />
      ));

      return (
        <Container>
          <Segment>
            <TextArea
              value={JSON.stringify(this.options, null, 2)}
              onChange={(e, { value }): void => {
                this.options = JSON.parse(`${value || ''}`);
              }}
            />
          </Segment>
          <CardGroup>
            <Card>
              <canvas ref={this.canvasRef} />
              <CardContent extra>
                <ActionButton color="blue" action={onSelectSource}>
                  画面選択
                </ActionButton>
                <ActionButton color="blue" action={onRecognize}>
                  認識
                </ActionButton>
                <ActionButton
                  color="blue"
                  disabled={tasks.length === 0}
                  action={onSubmit}
                >
                  登録
                </ActionButton>
              </CardContent>
            </Card>
            {tasks}
          </CardGroup>
          <audio
            src={Decision22}
            ref={this.soundRefs.triggered}
            preload="true"
          />
          <audio
            src={Decision24}
            ref={this.soundRefs.succeeded}
            preload="true"
          />
          <audio src={Warning1} ref={this.soundRefs.failed} preload="true" />
        </Container>
      );
    }
  },
);
