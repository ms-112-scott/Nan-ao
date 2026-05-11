import React, { useMemo, useState } from 'react';

/**
 * 左側分群樹：meta_group → node_Group → (節點數)
 */
export default function GroupSidebar({ nodes, onPickNodeGroup, onPickNode, collapsed, setCollapsed }) {
  const [open, setOpen] = useState(true);
  const tree = useMemo(() => {
    const t = {};
    for (const n of nodes) {
      const mg = n.meta_group || '其他';
      const ng = n.node_Group || '其他';
      if (!t[mg]) t[mg] = {};
      if (!t[mg][ng]) t[mg][ng] = [];
      t[mg][ng].push(n);
    }
    return t;
  }, [nodes]);

  if (!open) {
    return (
      <button
        className="btn icon-only paper-card"
        style={{ position: 'absolute', top: 80, left: 12, zIndex: 25 }}
        onClick={() => setOpen(true)}
        title="展開分群清單"
      >›</button>
    );
  }

  return (
    <div
      className="paper-card"
      style={{
        position: 'absolute', top: 80, left: 12, width: 240,
        maxHeight: 'calc(100vh - 200px)', overflowY: 'auto',
        padding: 12, zIndex: 25,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="caption" style={{ fontWeight: 600 }}>分群</div>
        <button className="btn icon-only" onClick={() => setOpen(false)} title="收起">‹</button>
      </div>
      {Object.entries(tree).map(([mg, subs]) => {
        const totalCount = Object.values(subs).reduce((s, arr) => s + arr.length, 0);
        const isCollapsed = collapsed.has(mg);
        return (
          <div key={mg} style={{ marginBottom: 8 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                padding: '4px 6px', borderRadius: 4,
              }}
              onClick={() => {
                const ns = new Set(collapsed);
                if (isCollapsed) ns.delete(mg); else ns.add(mg);
                setCollapsed(ns);
              }}
            >
              <span style={{ width: 12, fontSize: 10, color: 'var(--ink-faint)' }}>
                {isCollapsed ? '▸' : '▾'}
              </span>
              <span className="chip-dot" style={{ background: `var(--cat-${mg})` }} />
              <span
                className="caption"
                style={{ flex: 1, fontWeight: 600 }}
                onClick={(e) => { e.stopPropagation(); onPickNodeGroup?.(mg); }}
                title="只看此 meta_group"
              >{mg}</span>
              <span className="tiny num">{totalCount}</span>
            </div>
            {!isCollapsed && (
              <div style={{ paddingLeft: 22 }}>
                {Object.entries(subs).map(([ng, arr]) => (
                  <div key={ng} style={{ marginTop: 2 }}>
                    <div
                      className="tiny"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '2px 4px',
                      }}
                    >
                      <span style={{ flex: 1, color: 'var(--ink-secondary)' }}>{ng}</span>
                      <span className="num">{arr.length}</span>
                    </div>
                    {arr.length <= 8 && (
                      <div style={{ paddingLeft: 6, marginTop: 2 }}>
                        {arr.slice(0, 8).map((n) => (
                          <button
                            key={n.id}
                            onClick={() => onPickNode?.(n)}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              background: 'transparent', border: 0, padding: '1px 4px',
                              fontSize: 11, color: 'var(--ink-faint)', cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink-primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-faint)'}
                          >
                            {n.id}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
