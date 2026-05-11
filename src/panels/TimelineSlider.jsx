import React, { useMemo, useRef, useState, useEffect } from 'react';

/**
 * 雙端點時間滑桿 + 下方 10 年密度長條圖。
 */
export default function TimelineSlider({ min, max, value, onChange, nodes }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  const trackRef = useRef(null);
  const draggingRef = useRef(null); // 'left' | 'right' | 'range' | null

  const buckets = useMemo(() => {
    if (max <= min) return [];
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

  const yToX = (y) => ((y - min) / (max - min)) * 100;
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
      // commit
      setV((prev) => { onChange?.(prev); return prev; });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="tiny num">
        <span>{v[0]}</span>
        <span style={{ color: 'var(--ink-faint)' }}>{min}–{max}</span>
        <span>{v[1]}</span>
      </div>
      {/* 密度長條 */}
      <div style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        {buckets.arr?.map((c, i) => {
          const maxC = Math.max(...buckets.arr);
          const h = maxC ? (c / maxC) * 18 : 0;
          return <div key={i} style={{
            flex: 1, height: h, background: 'var(--ink-line)', borderRadius: '1px 1px 0 0',
          }} />;
        })}
      </div>
      {/* 滑桿軌 */}
      <div
        ref={trackRef}
        style={{
          position: 'relative', height: 6,
          background: 'var(--paper-edge)', borderRadius: 3,
        }}
      >
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
  );
}
