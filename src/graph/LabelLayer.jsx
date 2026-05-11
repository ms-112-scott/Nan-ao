import React, { useEffect, useState } from 'react';

/**
 * DOM overlay 顯示節點 label（中文襯線字 Canvas 渲染品質太差）。
 * 只在 zoom >= 0.7 時渲染；只渲染視窗內節點。
 * 訂閱 ForceGraph 的 transform / tick 事件。
 */
export default function LabelLayer({ graph, width, height, alwaysShowIds = null }) {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!graph) return;
    const onT = (t) => setTransform({ x: t.x, y: t.y, k: t.k });
    const onTick = () => setTick((n) => (n + 1) % 1000);
    graph.on('transform', onT);
    graph.on('tick', onTick);
    return () => {
      // ForceGraph 沒有 off()，但 destroy() 會清整套，這裡不漏。
    };
  }, [graph]);

  if (!graph || !graph.nodes) return null;
  const k = transform.k;
  const showAll = k >= 0.7;
  if (!showAll && !alwaysShowIds) return null;

  const visible = [];
  for (const n of graph.nodes) {
    if (n.x == null) continue;
    const sx = n.x * k + transform.x;
    const sy = n.y * k + transform.y;
    if (sx < -50 || sx > width + 50 || sy < -20 || sy > height + 20) continue;
    if (!showAll && !(alwaysShowIds && alwaysShowIds.has(n.id))) continue;
    visible.push({ id: n.id, sx, sy, n });
  }

  return (
    <div
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        zIndex: 5, overflow: 'hidden',
      }}
    >
      {visible.map(({ id, sx, sy, n }) => (
        <div
          key={id}
          style={{
            position: 'absolute',
            transform: `translate(${sx}px, ${sy + 14 + 2 * (n.importance ?? 3)}px) translateX(-50%)`,
            fontFamily: 'var(--font-serif)',
            fontSize: 11 + Math.min(2, k - 0.7),
            color: 'var(--ink-primary)',
            whiteSpace: 'nowrap',
            textShadow: '0 0 3px rgba(244,238,224,0.95), 0 0 3px rgba(244,238,224,0.95)',
            opacity: Math.min(1, (k - 0.5) * 1.5),
          }}
        >
          {id}
        </div>
      ))}
    </div>
  );
}
