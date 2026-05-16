import { useState } from 'react';
import './App.css';
import { ControlPanel, type AnimationConfig, type ParamValue } from './ControlPanel';
import { FractalCanvas, type RenderRequest } from './FractalCanvas';
import { fractals, getDefaults } from './fractals';

function App() {
  const [fractalId, setFractalId] = useState(fractals[0].id);
  const [params, setParams] = useState<Record<string, ParamValue>>(
    () => getDefaults(fractals[0]),
  );
  const [request, setRequest] = useState<RenderRequest | null>(null);
  const [rendering, setRendering] = useState(false);
  const [useCrosshair, setUseCrosshair] = useState(false);

  const handleFractalChange = (id: string) => {
    const next = fractals.find(f => f.id === id);
    if (!next) return;
    setFractalId(id);
    setParams(getDefaults(next));
  };

  const handleGenerate = (animation: AnimationConfig | null) => {
    setRequest({ id: Date.now(), fractalId, params, animation });
    setUseCrosshair(false);
  };

  const currentFractal = fractals.find(f => f.id === fractalId)!;
  const fractalHasCenter = currentFractal.params.some(p => p.key === 'centerX');
  const renderMatches =
    !!request && request.fractalId === fractalId &&
    typeof request.params.centerX === 'number' &&
    typeof request.params.centerY === 'number' &&
    typeof request.params.zoom === 'number';

  const crosshair =
    useCrosshair &&
    fractalHasCenter &&
    typeof params.centerX === 'number' &&
    typeof params.centerY === 'number'
      ? {
          currentX: params.centerX,
          currentY: params.centerY,
          renderedX: renderMatches ? Number(request!.params.centerX) : params.centerX,
          renderedY: renderMatches ? Number(request!.params.centerY) : params.centerY,
          renderedZoom: renderMatches
            ? Number(request!.params.zoom)
            : typeof params.zoom === 'number' && params.zoom > 0
              ? params.zoom
              : 1,
          onChange: (cx: number, cy: number) =>
            setParams(p => ({ ...p, centerX: cx, centerY: cy })),
        }
      : null;

  return (
    <div className="app">
      <FractalCanvas
        request={request}
        onRenderingChange={setRendering}
        crosshair={crosshair}
      />
      <ControlPanel
        fractalId={fractalId}
        onFractalChange={handleFractalChange}
        params={params}
        onParamsChange={setParams}
        useCrosshair={useCrosshair}
        onUseCrosshairChange={setUseCrosshair}
        onGenerate={handleGenerate}
        disabled={rendering}
      />
    </div>
  );
}

export default App;
