import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * 即時搜尋框（節點 id / info / node_Group / link 標籤）。
 */
export default function Search({ nodes, links, onSelectNode }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  // debounce
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 150);
    return () => clearTimeout(t);
  }, [q]);

  const results = useMemo(() => {
    if (!debouncedQ || debouncedQ.length < 1) return [];
    const ql = debouncedQ.toLowerCase();
    const out = [];
    for (const n of nodes) {
      const id = (n.id || '').toLowerCase();
      const info = (n.info || '').toLowerCase();
      const grp = (n.node_Group || '').toLowerCase();
      let score = 0;
      if (id.includes(ql)) score += id === ql ? 100 : (id.startsWith(ql) ? 50 : 30);
      if (grp.includes(ql)) score += 10;
      if (info.includes(ql)) score += 5;
      if (score > 0) out.push({ node: n, score });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, 30);
  }, [debouncedQ, nodes]);

  // 鍵盤
  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      onSelectNode(results[active].node);
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQ('');
      inputRef.current?.blur();
    }
  };

  // 全域快捷鍵 / 開搜尋
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{ position: 'relative', flex: '0 1 320px', maxWidth: 320 }}>
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={onKey}
        placeholder="搜尋節點…  ⌘K"
        style={{
          width: '100%', padding: '8px 12px',
          background: 'var(--paper-bg)', border: '1px solid var(--paper-edge)',
          borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)',
          fontSize: 13, color: 'var(--ink-primary)', outline: 'none',
        }}
      />
      {open && results.length > 0 && (
        <div
          className="paper-card"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
            maxHeight: 360, overflowY: 'auto', zIndex: 40, padding: 4,
          }}
        >
          {results.map((r, i) => (
            <button
              key={r.node.id}
              onMouseDown={(e) => { e.preventDefault(); onSelectNode(r.node); setOpen(false); }}
              onMouseEnter={() => setActive(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 10px',
                background: i === active ? 'var(--paper-bg)' : 'transparent',
                border: 0, cursor: 'pointer', textAlign: 'left',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-serif)', color: 'var(--ink-primary)', fontSize: 14,
              }}
            >
              <span className="chip-dot" style={{ background: `var(--cat-${r.node.meta_group})` }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.node.id}
              </span>
              <span className="tiny">{r.node.node_Group}{r.node.start_year ? ` · ${r.node.start_year}` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
