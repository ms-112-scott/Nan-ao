import React, { useEffect, useRef, useState } from 'react';
import { useGraphData } from './state/useGraphData.js';
import { ForceGraph } from './graph/ForceGraph.js';
import LabelLayer from './graph/LabelLayer.jsx';
import HoverTooltip from './graph/HoverTooltip.jsx';
import { computeNeighbors } from './utils/highlight.js';

export default function App() {
  const { data, loading, error } = useGraphData();
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [hover, setHover] = useState({ node: null, x: 0, y: 0 });
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!data || !containerRef.current) return;
    if (!graphRef.current) {
      graphRef.current = new ForceGraph(containerRef.current);
      graphRef.current.on('click', (n) => setSelected(n));
      graphRef.current.on('hover', (n, e) => {
        if (n && e) setHover({ node: n, x: e.clientX, y: e.clientY });
        else setHover({ node: null, x: 0, y: 0 });
      });
    }
    graphRef.current.setData(data.nodes, data.links);
  }, [data]);

  // 卸載清理
  useEffect(() => () => {
    if (graphRef.current) {
      graphRef.current.destroy();
      graphRef.current = null;
    }
  }, []);

  // 選中變化 → 設 highlight
  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    g.setSelected(selected?.id ?? null);
    if (!selected) {
      g.setHighlight(null, null);
      return;
    }
    const { nodeIds, linkKeys } = computeNeighbors(selected.id, g.links) || {};
    g.setHighlight(nodeIds, linkKeys);
  }, [selected]);

  // 永遠顯示選中與其鄰居的 label
  const alwaysShowIds = React.useMemo(() => {
    if (!selected || !graphRef.current) return null;
    const r = computeNeighbors(selected.id, graphRef.current.links);
    return r ? r.nodeIds : null;
  }, [selected]);

  return (
    <div className="paper-bg fixed inset-0">
      {/* 主圖 Canvas 容器 */}
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* DOM Label 圖層 */}
      <LabelLayer
        graph={graphRef.current}
        width={vp.w}
        height={vp.h}
        alwaysShowIds={alwaysShowIds}
      />

      {/* Hover tooltip */}
      <HoverTooltip node={hover.node} x={hover.x} y={hover.y} />

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center fade-in" style={{ zIndex: 100 }}>
          <div className="caption">載入南澳資料中...</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 100 }}>
          <div className="paper-card body" style={{ padding: 24, color: 'var(--cat-事件)' }}>
            錯誤：{error.message}
          </div>
        </div>
      )}

      {/* TopBar */}
      {data && (
        <div
          className="paper-card"
          style={{
            position: 'absolute', top: 12, left: 12, right: 12, height: 56,
            display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16,
            zIndex: 30,
          }}
        >
          <div className="title-2">南澳知識圖譜</div>
          <div className="caption">— Klesan 群人文地景數位典藏</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="tiny">節點 {data.stats.nodes} ・ 關係 {data.stats.links} ・ 突破點 {data.stats.breakthroughs}</span>
            <button
              className="btn"
              onClick={() => graphRef.current?.zoomToFit()}
              title="縮放到符合畫面"
            >
              ⛶ 全覽
            </button>
          </div>
        </div>
      )}

      {/* 暫時的選中節點顯示 */}
      {selected && (
        <div
          className="paper-card slide-in-right"
          style={{
            position: 'absolute', top: 80, right: 12, width: 340,
            padding: 20, zIndex: 30, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div className="title-1" style={{ marginBottom: 4 }}>{selected.id}</div>
            <button
              className="btn icon-only"
              onClick={() => setSelected(null)}
              aria-label="關閉"
            >✕</button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span className="chip">
              <span className="chip-dot" style={{ background: `var(--cat-${selected.meta_group})` }} />
              {selected.meta_group} · {selected.node_Group}
            </span>
            {selected.sources?.length > 1 && (
              <span className="chip" style={{ marginLeft: 6 }}>
                {selected.sources.length} 個來源
              </span>
            )}
          </div>
          {(selected.start_year || selected.end_year) && (
            <div className="caption num" style={{ marginBottom: 12 }}>
              {selected.start_year ?? '?'} – {selected.end_year ?? selected.start_year ?? '?'}
            </div>
          )}
          <div className="body">{selected.info}</div>
          {selected.breakthrough_note && (
            <div className="breakthrough-frame" style={{ marginTop: 16 }}>
              <div className="caption breakthrough-star" style={{ marginBottom: 6 }}>
                ★ 突破點
              </div>
              <div className="body">{selected.breakthrough_note}</div>
            </div>
          )}
          {selected.sources?.length > 0 && (
            <div className="tiny" style={{ marginTop: 16 }}>
              來源：{selected.sources.join('、')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
