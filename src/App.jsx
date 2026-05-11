import React, { useEffect, useRef, useState } from 'react';
import { useGraphData } from './state/useGraphData.js';
import { ForceGraph } from './graph/ForceGraph.js';

export default function App() {
  const { data, loading, error } = useGraphData();
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!data || !containerRef.current) return;
    if (!graphRef.current) {
      graphRef.current = new ForceGraph(containerRef.current);
      graphRef.current.on('click', (n) => setSelected(n));
    }
    graphRef.current.setData(data.nodes, data.links);
    return () => {
      // 不在每次資料更新時 destroy；只在卸載時
    };
  }, [data]);

  useEffect(() => {
    return () => {
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (graphRef.current) graphRef.current.setSelected(selected?.id ?? null);
  }, [selected]);

  return (
    <div className="paper-bg fixed inset-0">
      {/* 主圖 Canvas 容器 */}
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 1 }} />

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
          <div style={{ marginLeft: 'auto' }} className="tiny">
            節點 {data.stats.nodes} ・ 關係 {data.stats.links} ・ 突破點 {data.stats.breakthroughs}
          </div>
        </div>
      )}

      {/* 暫時的選中節點顯示（Phase 5 會升級為 InfoCard） */}
      {selected && (
        <div
          className="paper-card slide-in-right"
          style={{
            position: 'absolute', top: 80, right: 12, width: 320,
            padding: 20, zIndex: 30, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
          }}
        >
          <div className="title-1" style={{ marginBottom: 8 }}>{selected.id}</div>
          <div style={{ marginBottom: 12 }}>
            <span className="chip">
              <span className="chip-dot" style={{ background: `var(--cat-${selected.meta_group})` }} />
              {selected.meta_group} · {selected.node_Group}
            </span>
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
          <button
            className="btn"
            style={{ marginTop: 16 }}
            onClick={() => setSelected(null)}
          >
            關閉
          </button>
        </div>
      )}
    </div>
  );
}
