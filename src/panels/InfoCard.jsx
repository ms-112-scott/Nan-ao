import React from 'react';

/**
 * 右側節點詳情面板。
 * Props: node, onClose, onNodeClick(node), graph (for relations lookup)
 */
export default function InfoCard({ node, onClose, onNodeClick, allLinks, allNodesById }) {
  if (!node) return null;

  // 找相關節點，依 meta_relation 分組
  const related = React.useMemo(() => {
    if (!node || !allLinks) return {};
    const groups = { spatial: [], social: [], causal: [], creative: [], documentary: [], 其他: [] };
    for (const l of allLinks) {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      let other = null;
      if (s === node.id) other = t;
      else if (t === node.id) other = s;
      else continue;
      const otherNode = allNodesById?.get(other);
      if (!otherNode) continue;
      const arr = groups[l.meta_relation] || groups['其他'];
      arr.push({ node: otherNode, label: l.label, info: l.info });
    }
    return groups;
  }, [node, allLinks, allNodesById]);

  const groupLabels = {
    spatial: '空間關係', social: '人際關係', causal: '因果與影響',
    creative: '創作與設計', documentary: '紀錄與引用', 其他: '其他關係',
  };

  const copyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('node', node.id);
    navigator.clipboard?.writeText(url.toString());
  };

  return (
    <div
      className="paper-card slide-in-right"
      style={{
        position: 'absolute', top: 80, right: 12, width: 360,
        padding: 20, zIndex: 30,
        maxHeight: 'calc(100vh - 180px)', overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div className="title-1" style={{ marginBottom: 4 }}>{node.id}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="chip">
              <span className="chip-dot" style={{ background: `var(--cat-${node.meta_group})` }} />
              {node.meta_group}
            </span>
            <span className="chip">{node.node_Group}</span>
            {node.sources?.length > 0 && (
              <span className="chip">{node.sources.length} 來源</span>
            )}
          </div>
        </div>
        <button className="btn icon-only" onClick={onClose} aria-label="關閉">✕</button>
      </div>

      {(node.start_year || node.end_year) && (
        <div className="caption num" style={{ marginTop: 12 }}>
          {node.start_year ?? '?'}{node.end_year && node.end_year !== node.start_year ? ` – ${node.end_year}` : ''}
        </div>
      )}

      {node.info && (
        <div className="body" style={{ marginTop: 12 }}>{node.info}</div>
      )}

      {node.breakthrough_note && (
        <div className="breakthrough-frame" style={{ marginTop: 16 }}>
          <div className="caption breakthrough-star" style={{ marginBottom: 6 }}>★ 突破點</div>
          <div className="body">{node.breakthrough_note}</div>
        </div>
      )}

      {/* 相關節點分組 */}
      <div style={{ marginTop: 20 }}>
        {Object.entries(related).map(([key, items]) => {
          if (!items.length) return null;
          return (
            <div key={key} style={{ marginBottom: 16 }}>
              <div
                className="caption"
                style={{
                  fontWeight: 600, color: 'var(--ink-secondary)',
                  borderLeft: `3px solid var(--rel-${key})`, paddingLeft: 8, marginBottom: 6,
                }}
              >
                {groupLabels[key]}（{items.length}）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.slice(0, 12).map((it, i) => (
                  <button
                    key={i}
                    className="btn"
                    style={{
                      justifyContent: 'flex-start', textAlign: 'left',
                      padding: '6px 10px', fontSize: 13,
                    }}
                    onClick={() => onNodeClick?.(it.node)}
                    title={it.info || ''}
                  >
                    <span className="chip-dot" style={{ background: `var(--cat-${it.node.meta_group})`, marginRight: 6 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.node.id}
                    </span>
                    <span className="tiny" style={{ marginLeft: 6 }}>{it.label}</span>
                  </button>
                ))}
                {items.length > 12 && (
                  <div className="tiny" style={{ paddingLeft: 10 }}>... 還有 {items.length - 12} 個</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {node.sources?.length > 0 && (
        <>
          <hr className="divider" style={{ margin: '16px 0' }} />
          <div className="tiny">來源 sheet：{node.sources.join('、')}</div>
        </>
      )}

      <hr className="divider" style={{ margin: '16px 0' }} />
      <button className="btn" onClick={copyLink} style={{ width: '100%' }}>
        🔗 複製永久連結
      </button>
    </div>
  );
}
