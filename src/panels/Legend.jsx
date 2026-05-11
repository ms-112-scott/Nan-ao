import React from 'react';

/**
 * meta_group 圖例 + 「★ 只看突破點」 toggle。
 * 點擊 chip 切換該 group 的勾選。
 */
export default function Legend({ metaGroups, activeGroups, onToggleGroup, onlyBreakthrough, onToggleBreakthrough, breakthroughCount }) {
  return (
    <div
      className="paper-card"
      style={{
        position: 'absolute', bottom: 100, right: 12, padding: 12, zIndex: 25,
        display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180,
      }}
    >
      <div className="tiny" style={{ marginBottom: 4, color: 'var(--ink-faint)' }}>圖例（點即篩）</div>
      {metaGroups.map((g) => {
        const on = activeGroups.has(g.id);
        return (
          <button
            key={g.id}
            className={'btn' + (on ? '' : '')}
            onClick={() => onToggleGroup(g.id)}
            style={{
              justifyContent: 'flex-start', padding: '4px 8px', fontSize: 12,
              opacity: on ? 1 : 0.4,
            }}
          >
            <span className="chip-dot" style={{ background: `var(--cat-${g.id})` }} />
            <span style={{ flex: 1, textAlign: 'left' }}>{g.id}</span>
            <span className="tiny num">{g.count}</span>
          </button>
        );
      })}

      {breakthroughCount > 0 && (
        <>
          <hr className="divider" style={{ margin: '4px 0' }} />
          <button
            className={'btn' + (onlyBreakthrough ? ' active' : '')}
            onClick={onToggleBreakthrough}
            style={{ padding: '4px 8px', fontSize: 12 }}
          >
            <span className="breakthrough-star">★</span>
            <span style={{ flex: 1, textAlign: 'left' }}>只看突破點</span>
            <span className="tiny num">{breakthroughCount}</span>
          </button>
        </>
      )}
    </div>
  );
}
