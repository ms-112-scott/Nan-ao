import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';

/**
 * 雙端點時間滑桿。
 * - 上：密度長條
 * - 中：年度刻度（依寬度自適應每 N 年一格）
 * - 下：滑桿軌；左右端點上方有跟隨移動的年份 label
 * 右側：⏱「只看有時間的節點」toggle
 */
export default function TimelineSlider({ min, max, value, onChange, nodes, onlyDated, onToggleOnlyDated }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);

  const trackRef = useRef(null);
  const draggingRef = useRef(null);
  const [trackW, setTrackW] = useState(400);

  useLayoutEffect(() => {
    if (!trackRef.current) return;
    const ro = new ResizeObserver((es) => setTrackW(es[0].contentRect.width));
    ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, []);

  const buckets = useMemo(() => {
    if (max <= min) return { arr: [], step: 1 };
    const span = max - min;
    const step = Math.max(5, Math.ceil(span / 30));
    const arr = new Array(Math.ceil(span / step) + 1).fill(0);
    for (const n of nodes) {
      const y = n.start_year ?? n.end_year;
      if (!y) continue;
      const i = Math.floor((y - min) / step);
      if (i >= 0 && i < arr.length) arr[i]++;
    }
    return { arr, step };
  }, [min, max, nodes]);

  // 年度刻度（依寬度自適應）
  const ticks = useMemo(() => {
    const span = max - min;
    if (span <= 0) return [];
    const interval = niceTickInterval(span, trackW);
    const start = Math.ceil(min / interval) * interval;
    const out = [];
    for (let y = start; y <= max; y += interval) {
      const pct = (y - min) / span;
      if (pct < 0.02 || pct > 0.98) continue; // 邊緣讓給 min/max handle label
      out.push(y);
    }
    return out;
  }, [min, max, trackW]);

  const yToX = (y) => ((y - min) / (max - min || 1)) * 100;
  const xToY = (xPct) => Math.round(min + (xPct / 100) * (max - min));

  const onPointer = (which) => (e) => {
    e.preventDefault();
    draggingRef.current = which;
    const move = (ev) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / rect.width;
      const xClamped = Math.max(0, Math.min(1, x));
      const y = xToY(xClamped * 100);
      setV((prev) => {
        const [a, b] = prev;
        if (draggingRef.current === 'left') return [Math.min(y, b), b];
        if (draggingRef.current === 'right') return [a, Math.max(y, a)];
        return prev;
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      draggingRef.current = null;
      setV((prev) => { onChange?.(prev); return prev; });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flex: 1, minWidth: 220 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        {/* 密度長條 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 16, gap: 1 }}>
          {buckets.arr.map((c, i) => {
            const maxC = Math.max(...buckets.arr);
            const h = maxC ? (c / maxC) * 16 : 0;
            return (
              <div
                key={i}
                style={{
                  flex: 1, height: h,
                  background: 'var(--ink-line)', borderRadius: '1px 1px 0 0',
                }}
              />
            );
          })}
        </div>

        {/* 年度刻度 */}
        <div style={{ position: 'relative', height: 16 }}>
          {ticks.map((y) => (
            <div
              key={y}
              style={{
                position: 'absolute', left: `${yToX(y)}%`,
                transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <div style={{ width: 1, height: 4, background: 'var(--ink-line)' }} />
              <div
                className="num"
                style={{ fontSize: 9, color: 'var(--ink-faint)', lineHeight: 1, marginTop: 2 }}
              >
                {y}
              </div>
            </div>
          ))}
        </div>

        {/* 滑桿軌 + 跟隨端點的年份 label */}
        <div
          ref={trackRef}
          style={{
            position: 'relative', height: 6, marginTop: 18,
            background: 'var(--paper-edge)', borderRadius: 3,
          }}
        >
          {/* 跟隨左端 label */}
          <div
            className="num"
            style={{
              position: 'absolute', top: -16,
              left: `${yToX(v[0])}%`, transform: 'translateX(-50%)',
              fontSize: 11, color: 'var(--ink-primary)', fontWeight: 600,
              whiteSpace: 'nowrap', pointerEvents: 'none',
            }}
          >{v[0]}</div>
          {/* 跟隨右端 label */}
          <div
            className="num"
            style={{
              position: 'absolute', top: -16,
              left: `${yToX(v[1])}%`, transform: 'translateX(-50%)',
              fontSize: 11, color: 'var(--ink-primary)', fontWeight: 600,
              whiteSpace: 'nowrap', pointerEvents: 'none',
            }}
          >{v[1]}</div>

          {/* 已選範圍 */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: yToX(v[0]) + '%', width: (yToX(v[1]) - yToX(v[0])) + '%',
            background: 'var(--ink-secondary)', borderRadius: 3,
          }} />
          {/* 左端點 */}
          <div
            onPointerDown={onPointer('left')}
            style={{
              position: 'absolute', top: -7, left: `calc(${yToX(v[0])}% - 10px)`,
              width: 20, height: 20, borderRadius: 10,
              background: 'var(--paper-bg)', border: '2px solid var(--ink-primary)',
              cursor: 'ew-resize', touchAction: 'none',
            }}
          />
          {/* 右端點 */}
          <div
            onPointerDown={onPointer('right')}
            style={{
              position: 'absolute', top: -7, left: `calc(${yToX(v[1])}% - 10px)`,
              width: 20, height: 20, borderRadius: 10,
              background: 'var(--paper-bg)', border: '2px solid var(--ink-primary)',
              cursor: 'ew-resize', touchAction: 'none',
            }}
          />
        </div>
      </div>

      {/* 右側：全範圍 + dated toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, paddingBottom: 4 }}>
        <span className="tiny num" style={{ color: 'var(--ink-faint)' }}>{min}–{max}</span>
        {onToggleOnlyDated && (
          <button
            className={'btn' + (onlyDated ? ' active' : '')}
            onClick={onToggleOnlyDated}
            style={{ padding: '2px 8px', fontSize: 11, whiteSpace: 'nowrap' }}
            title="只顯示有時間標記的節點"
          >
            ⏱ 只看有時間的節點
          </button>
        )}
      </div>
    </div>
  );
}

// 年度刻度間隔：依軌道寬度與年數量級，snap 到 1/2/5×10^n
function niceTickInterval(span, trackPx, targetGap = 80) {
  const tickCount = Math.max(2, Math.round(trackPx / targetGap));
  const raw = span / tickCount;
  const log = Math.floor(Math.log10(raw));
  const norm = raw / Math.pow(10, log);
  let snapped;
  if (norm < 1.5) snapped = 1;
  else if (norm < 3) snapped = 2;
  else if (norm < 7) snapped = 5;
  else snapped = 10;
  return Math.max(1, Math.round(snapped * Math.pow(10, log)));
}
