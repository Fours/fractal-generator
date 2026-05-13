import { useState } from 'react';
import { fractals, getDefaults, type ParamDef } from './fractals';
import './ControlPanel.css';

type ParamValue = number | string;

interface ControlPanelProps {
  onGenerate: (fractalId: string, params: Record<string, ParamValue>) => void;
  disabled?: boolean;
}

export function ControlPanel({ onGenerate, disabled = false }: ControlPanelProps) {
  const [fractalId, setFractalId] = useState(fractals[0].id);
  const fractal = fractals.find(f => f.id === fractalId)!;
  const [params, setParams] = useState<Record<string, ParamValue>>(() => getDefaults(fractal));

  const handleFractalChange = (id: string) => {
    const next = fractals.find(f => f.id === id);
    if (!next) return;
    setFractalId(id);
    setParams(getDefaults(next));
  };

  const setParam = (key: string, value: ParamValue) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <aside className="control-panel">
      <header className="cp-header">
        <div className="cp-title">FRACTAL GENERATOR</div>
        <div className="cp-subtitle">v0.1 · control panel</div>
      </header>

      <div className="cp-scroll">
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
      </div>

      <button
        type="button"
        className="cp-generate"
        onClick={() => onGenerate(fractalId, params)}
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
