import React from 'react';

/**
 * 圖譜控制面板：文字大小 / 節點大小 / 節點斥力 三個滑軌。
 * 由 App 控管 state，傳入 onChange。
 */
export default function GraphControl({
  fontSize, onFontSize,
  nodeScale, onNodeScale,
  charge, onCharge,
  spatialMode, onSpatialMode, geoCount = 0,
  open, onToggleOpen,
  onReset,
  style = {},
}) {
  if (!open) {
    return (
      <button
        className="btn icon-only paper-card"
        style={{ ...style }}
        onClick={onToggleOpen}
        title="展開圖譜控制"
      >⚙</button>
    );
  }

  return (
    <div
      className="paper-card"
      style={{
        padding: 12,
        display: 'flex', flexDirection: 'column', gap: 10,
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="caption" style={{ fontWeight: 600 }}>圖譜控制</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn"
            onClick={onReset}
            style={{ padding: '2px 8px', fontSize: 11 }}
            title="重置控制"
          >↺</button>
          <button className="btn icon-only" onClick={onToggleOpen} title="收起" style={{ width: 24, height: 24, padding: 0 }}>‹</button>
        </div>
      </div>

      {onSpatialMode && (
        <label
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 6px', borderRadius: 4,
            background: spatialMode ? 'var(--breakthrough-soft)' : 'transparent',
            cursor: geoCount > 0 ? 'pointer' : 'not-allowed',
            opacity: geoCount > 0 ? 1 : 0.5,
          }}
          title={geoCount > 0 ? `將 ${geoCount} 個有經緯度的節點以地理位置擺放` : '無任何節點具有經緯度'}
        >
          <input
            type="checkbox"
            checked={!!spatialMode}
            disabled={geoCount === 0}
            onChange={(e) => onSpatialMode(e.target.checked)}
            style={{ accentColor: 'var(--breakthrough)' }}
          />
          <span className="caption" style={{ flex: 1, fontWeight: 600 }}>空間定位</span>
          <span className="tiny num" style={{ color: 'var(--ink-faint)' }}>{geoCount} 點</span>
        </label>
      )}
      <hr className="divider" style={{ margin: '0' }} />

      <Slider
        label="文字大小"
        value={fontSize}
        min={9} max={20} step={1}
        suffix="px"
        onChange={onFontSize}
      />
      <Slider
        label="節點大小"
        value={nodeScale}
        min={0.5} max={2.0} step={0.05}
        suffix="×"
        onChange={onNodeScale}
        format={(v) => v.toFixed(2)}
      />
      <Slider
        label="節點斥力"
        value={Math.abs(charge)}
        min={80} max={1000} step={20}
        onChange={(v) => onCharge(-v)}
      />
    </div>
  );
}

function Slider({ label, value, min, max, step, suffix = '', onChange, format }) {
  const display = format ? format(value) : value;
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="tiny" style={{ color: 'var(--ink-secondary)' }}>{label}</span>
        <span className="tiny num" style={{ color: 'var(--ink-faint)' }}>{display}{suffix}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--ink-primary)' }}
      />
    </label>
  );
}
