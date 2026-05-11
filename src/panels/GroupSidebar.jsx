import React, { useMemo } from 'react';

/**
 * 左側分群樹：meta_group → node_Group → (節點數)
 * - chevron：展開 / 收合
 * - meta_group 標籤：點擊以高亮整群節點
 * - subgroup 標籤：點擊以高亮該子群節點
 * - 每個 meta_group 之間有分割線
 */
export default function GroupSidebar({
  nodes, onPickNodeGroup, onPickNode, onHighlightIds,
  collapsed, setCollapsed, activeHighlightKey,
  open, setOpen,
  bottomOffset = 16,
}) {
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

  const entries = Object.entries(tree);

  return (
    <div
      className="paper-card"
      style={{
        position: 'absolute', top: 80, left: 12, width: 240,
        bottom: bottomOffset, overflowY: 'auto',
        padding: 12, zIndex: 25,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="caption" style={{ fontWeight: 600 }}>分群</div>
        <button className="btn icon-only" onClick={() => setOpen(false)} title="收起">‹</button>
      </div>
      {entries.map(([mg, subs], idx) => {
        const totalCount = Object.values(subs).reduce((s, arr) => s + arr.length, 0);
        const isCollapsed = collapsed.has(mg);
        const groupKey = `mg:${mg}`;
        const groupActive = activeHighlightKey === groupKey;
        return (
          <React.Fragment key={mg}>
            {idx > 0 && <hr className="divider" style={{ margin: '6px 0' }} />}
            <div style={{ marginBottom: 4 }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 6px', borderRadius: 4,
                  background: groupActive ? 'var(--breakthrough-soft)' : 'transparent',
                }}
              >
                <span
                  style={{ width: 12, fontSize: 10, color: 'var(--ink-faint)', cursor: 'pointer' }}
                  onClick={() => {
                    const ns = new Set(collapsed);
                    if (isCollapsed) ns.delete(mg); else ns.add(mg);
                    setCollapsed(ns);
                  }}
                  title={isCollapsed ? '展開' : '收合'}
                >
                  {isCollapsed ? '▸' : '▾'}
                </span>
                <span className="chip-dot" style={{ background: `var(--cat-${mg})` }} />
                <span
                  className="caption"
                  style={{ flex: 1, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => {
                    const ids = new Set();
                    for (const arr of Object.values(subs)) for (const n of arr) ids.add(n.id);
                    onHighlightIds?.(ids, groupKey);
                  }}
                  title="高亮此 meta_group"
                >{mg}</span>
                <span
                  className="tiny"
                  style={{ cursor: 'pointer', color: 'var(--ink-faint)' }}
                  onClick={() => onPickNodeGroup?.(mg)}
                  title="僅顯示此 meta_group"
                >⊙</span>
                <span className="tiny num">{totalCount}</span>
              </div>
              {!isCollapsed && (
                <div style={{ paddingLeft: 22 }}>
                  {Object.entries(subs).map(([ng, arr]) => {
                    const subKey = `sg:${mg}/${ng}`;
                    const subActive = activeHighlightKey === subKey;
                    return (
                      <div key={ng} style={{ marginTop: 2 }}>
                        <div
                          className="tiny"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '2px 4px', borderRadius: 3, cursor: 'pointer',
                            background: subActive ? 'var(--breakthrough-soft)' : 'transparent',
                          }}
                          onClick={() => {
                            const ids = new Set(arr.map((n) => n.id));
                            onHighlightIds?.(ids, subKey);
                          }}
                          title="高亮此子群"
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
                    );
                  })}
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
