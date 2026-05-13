import { useEffect, useState } from 'react';
import { fractals, getDefaults, type ParamDef } from './fractals';
import './ControlPanel.css';

type ParamValue = number | string;

interface Preset {
  fractalId: string;
  params: Record<string, ParamValue>;
}

const PRESETS_STORAGE_KEY = 'fractal-generator:presets';

function loadPresets(): Record<string, Preset> {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, Preset>;
    }
    return {};
  } catch {
    return {};
  }
}

export interface AnimationConfig {
  zoomDelta: number;
  frames: number;
}

interface ControlPanelProps {
  onGenerate: (
    fractalId: string,
    params: Record<string, ParamValue>,
    animation: AnimationConfig | null,
  ) => void;
  disabled?: boolean;
}

export function ControlPanel({ onGenerate, disabled = false }: ControlPanelProps) {
  const [fractalId, setFractalId] = useState(fractals[0].id);
  const fractal = fractals.find(f => f.id === fractalId)!;
  const [params, setParams] = useState<Record<string, ParamValue>>(() => getDefaults(fractal));

  const [animationEnabled, setAnimationEnabled] = useState(false);
  const [zoomDelta, setZoomDelta] = useState(0.1);
  const [frameCount, setFrameCount] = useState(10);

  const [presets, setPresets] = useState<Record<string, Preset>>(loadPresets);
  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    const names = Object.keys(loadPresets()).sort();
    return names[0] ?? '';
  });

  useEffect(() => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // localStorage may be unavailable or full — silently skip
    }
  }, [presets]);

  const presetNames = Object.keys(presets).sort();

  const handleFractalChange = (id: string) => {
    const next = fractals.find(f => f.id === id);
    if (!next) return;
    setFractalId(id);
    setParams(getDefaults(next));
  };

  const setParam = (key: string, value: ParamValue) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveAs = () => {
    const input = window.prompt('Save preset as…');
    if (input === null) return;
    const name = input.trim();
    if (!name) return;
    if (presets[name] && !window.confirm(`Overwrite preset "${name}"?`)) return;
    setPresets(prev => ({ ...prev, [name]: { fractalId, params } }));
    setSelectedPreset(name);
  };

  const handleLoadPreset = () => {
    const preset = presets[selectedPreset];
    if (!preset) return;
    const next = fractals.find(f => f.id === preset.fractalId);
    if (!next) return;
    setFractalId(preset.fractalId);
    setParams({ ...getDefaults(next), ...preset.params });
  };

  return (
    <aside className="control-panel">
      <header className="cp-header">
        <div className="cp-title">FRACTAL GENERATOR</div>
        <div className="cp-subtitle">v0.1 · control panel</div>
      </header>

      <div className="cp-scroll">
        <section className="cp-section">
          <label className="cp-section-label">User presets</label>
          <select
            className="cp-select"
            value={selectedPreset}
            onChange={e => setSelectedPreset(e.target.value)}
            disabled={presetNames.length === 0}
          >
            {presetNames.length === 0 ? (
              <option value="">— no presets saved —</option>
            ) : (
              presetNames.map(n => <option key={n} value={n}>{n}</option>)
            )}
          </select>
          <div className="cp-preset-actions">
            <button
              type="button"
              className="cp-button"
              onClick={handleLoadPreset}
              disabled={!selectedPreset || !presets[selectedPreset]}
            >
              Load
            </button>
            <button type="button" className="cp-button" onClick={handleSaveAs}>
              Save as…
            </button>
          </div>
        </section>

        <section className="cp-section">
          <label className="cp-section-label">Fractal type</label>
          <select
            className="cp-select cp-select-main"
            value={fractalId}
            onChange={e => handleFractalChange(e.target.value)}
          >
            {fractals.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <div className="cp-formula">{fractal.formula}</div>
        </section>

        <section className="cp-section">
          <label className="cp-section-label">Parameters</label>
          <div className="cp-params">
            {fractal.params.map(p => (
              <ParamControl
                key={p.key}
                param={p}
                value={params[p.key]}
                onChange={v => setParam(p.key, v)}
              />
            ))}
          </div>
        </section>

        <section className="cp-section">
          <label className="cp-section-label">Animate</label>
          <label className="cp-toggle">
            <input
              type="checkbox"
              checked={animationEnabled}
              onChange={e => setAnimationEnabled(e.target.checked)}
            />
            <span>Animation mode</span>
          </label>
          {animationEnabled && (
            <div className="cp-params cp-animate-params">
              <div className="cp-param">
                <label className="cp-param-label">Zoom delta</label>
                <input
                  type="number"
                  className="cp-input"
                  step={0.1}
                  value={zoomDelta}
                  onChange={e => setZoomDelta(Number(e.target.value))}
                />
              </div>
              <div className="cp-param">
                <label className="cp-param-label">Frames</label>
                <input
                  type="number"
                  className="cp-input"
                  step={1}
                  min={1}
                  max={240}
                  value={frameCount}
                  onChange={e => {
                    const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                    setFrameCount(n);
                  }}
                />
              </div>
            </div>
          )}
        </section>
      </div>

      <button
        type="button"
        className="cp-generate"
        onClick={() =>
          onGenerate(
            fractalId,
            params,
            animationEnabled ? { zoomDelta, frames: frameCount } : null,
          )
        }
        disabled={disabled}
      >
        <span className="cp-generate-label">Generate</span>
      </button>
    </aside>
  );
}

function ParamControl({
  param,
  value,
  onChange,
}: {
  param: ParamDef;
  value: ParamValue;
  onChange: (v: ParamValue) => void;
}) {
  if (param.type === 'slider') {
    return (
      <div className="cp-param">
        <div className="cp-param-row">
          <label className="cp-param-label">{param.label}</label>
          <span className="cp-param-value">{formatNumber(value)}</span>
        </div>
        <input
          type="range"
          className="cp-slider"
          min={param.min}
          max={param.max}
          step={param.step ?? 1}
          value={value as number}
          onChange={e => onChange(Number(e.target.value))}
        />
      </div>
    );
  }

  if (param.type === 'number') {
    return (
      <div className="cp-param">
        <label className="cp-param-label">{param.label}</label>
        <input
          type="number"
          className="cp-input"
          step={param.step}
          min={param.min}
          max={param.max}
          value={value as number}
          onChange={e => onChange(Number(e.target.value))}
        />
      </div>
    );
  }

  return (
    <div className="cp-param">
      <label className="cp-param-label">{param.label}</label>
      <select
        className="cp-select"
        value={value as string}
        onChange={e => onChange(e.target.value)}
      >
        {param.options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function formatNumber(value: ParamValue): string {
  if (typeof value !== 'number') return String(value);
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toString();
}
