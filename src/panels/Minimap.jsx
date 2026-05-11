import React, { useEffect, useRef, useState } from 'react';

/**
 * Minimap：縮圖 + 視窗方框。可拖移定位主圖。
 */
export default function Minimap({ graph, width = 160, height = 110 }) {
  const cvRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    if (!graph) return;
    const onTick = () => force((n) => (n + 1) % 1e6);
    const onT = () => force((n) => (n + 1) % 1e6);
    graph.on('tick', onTick);
    graph.on('transform', onT);
  }, [graph]);

  useEffect(() => {
    if (!graph || !cvRef.current || collapsed) return;
    const cv = cvRef.current;
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    cv.width = width * dpr; cv.height = height * dpr;
    cv.style.width = width + 'px'; cv.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!graph.nodes.length) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of graph.nodes) {
      if (n.x == null) continue;
      if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x; if (n.y > maxY) maxY = n.y;
    }
    const padding = 8;
    const w = (maxX - minX) || 1, h = (maxY - minY) || 1;
    const scale = Math.min((width - padding * 2) / w, (height - padding * 2) / h);
    const ox = (width - w * scale) / 2 - minX * scale;
    const oy = (height - h * scale) / 2 - minY * scale;

    // 點
    for (const n of graph.nodes) {
      if (n.x == null) continue;
      const px = n.x * scale + ox;
      const py = n.y * scale + oy;
      const cssVar = `--cat-${n.meta_group}`;
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || '#888';
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 視窗方框
    const t = graph.transform;
    const vw = graph.width / t.k;
    const vh = graph.height / t.k;
    const vx = -t.x / t.k;
    const vy = -t.y / t.k;
    ctx.strokeStyle = 'rgba(42,38,32,0.7)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(vx * scale + ox, vy * scale + oy, vw * scale, vh * scale);
  });

  if (collapsed) {
    return (
      <button
        className="btn icon-only paper-card"
        style={{ position: 'absolute', bottom: 80, right: 12, zIndex: 25 }}
        onClick={() => setCollapsed(false)}
        title="展開縮圖"
      >🗺</button>
    );
  }

  return (
    <div
      className="paper-card"
      style={{
        position: 'absolute', bottom: 80, right: 12, padding: 8, zIndex: 25,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span className="tiny" style={{ color: 'var(--ink-faint)' }}>縮圖</span>
        <button className="btn icon-only" onClick={() => setCollapsed(true)} style={{ width: 18, height: 18, padding: 0 }}>
          —
        </button>
      </div>
      <canvas ref={cvRef} style={{ display: 'block' }} />
    </div>
  );
}
