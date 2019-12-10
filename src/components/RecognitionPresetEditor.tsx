import React, { useState, useRef, useEffect } from 'react';
import { Form, FormTextArea, FormButton } from 'semantic-ui-react';
import { safeDump, safeLoad } from 'js-yaml';
import RecognitionPreset, {
  Size,
  loadPreset,
  savePreset,
  drawPreset,
} from '../recognition/RecognitionPreset';

export default function RecognitionPresetEditor({
  stream,
}: {
  stream: MediaStream;
}): JSX.Element {
  const [preset, setPreset] = useState<RecognitionPreset>(loadPreset());
  const [presetYaml, setPresetYaml] = useState<string>(safeDump(preset));
  const [presetError, setPresetError] = useState<string>();
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [capture, setCapture] = useState<ImageCapture>();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const parsed = safeLoad(presetYaml);
      setPreset(
        (prev): RecognitionPreset => ({
          ...prev,
          ...parsed,
        }),
      );
      setPresetError(undefined);
    } catch (error) {
      setPresetError(error.message);
    }
  }, [presetYaml]);

  useEffect(() => {
    const [track] = stream.getVideoTracks();
    if (!track) return;

    const { width, height } = track.getSettings();
    if (!width || !height) return;
    setSize({ width, height });

    setCapture(new ImageCapture(track));
  }, [stream]);

  const canvas = canvasRef.current;
  useEffect(() => {
    if (!capture || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const render = async (): Promise<void> => {
      try {
        context.fillStyle = 'white';
        context.fillRect(0, 0, size.width, size.height);
        const frame = await capture.grabFrame();
        context.drawImage(frame, 0, 0);
        drawPreset(context, preset);
      } catch (error) {
        console.error(error);
      }
    };

    const interval = setInterval(render, 1000 / preset.fps);

    render();

    return (): void => {
      clearInterval(interval);
    };
  }, [preset, canvas, capture]);

  return (
    <Form>
      <FormTextArea
        error={presetError}
        value={presetYaml}
        onChange={(_e, { value }): void =>
          setPresetYaml(typeof value === 'string' ? value : '')
        }
      />
      <FormButton onClick={() => savePreset(preset)}>保存</FormButton>
      <div
        style={{
          overflow: 'auto',
          maxWidth: '100%',
          maxHeight: 200,
          textAlign: 'center',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ overflow: 'auto', maxWidth: '100%', maxHeight: '100%' }}
          {...size}
        />
      </div>
    </Form>
  );
}
