import { useState } from 'react';
import './App.css';
import { ControlPanel } from './ControlPanel';
import { FractalCanvas, type RenderRequest } from './FractalCanvas';

function App() {
  const [request, setRequest] = useState<RenderRequest | null>(null);
  const [rendering, setRendering] = useState(false);

  const handleGenerate = (fractalId: string, params: Record<string, number | string>) => {
    setRequest({ id: Date.now(), fractalId, params });
  };

  return (
    <div className="app">
      <FractalCanvas request={request} onRenderingChange={setRendering} />
      <ControlPanel onGenerate={handleGenerate} disabled={rendering} />
    </div>
  );
}

export default App;
