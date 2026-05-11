import React from 'react';

/**
 * meta_group 圖例（chip 列）+ 「★ 只看突破點」 toggle。
 * 預設使用 horizontal 模式（融入底部控制列）。
 */
export default function Legend({
  metaGroups, activeGroups, onToggleGroup,
  onlyBreakthrough, onToggleBreakthrough, breakthroughCount,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {metaGroups.map((g) => {
        const on = activeGroups.has(g.id);
        return (
          <button
            key={g.id}
            className="btn"
            onClick={() => onToggleGroup(g.id)}
            style={{
              padding: '2px 8px', fontSize: 11,
              opacity: on ? 1 : 0.4,
            }}
            title={`${g.id}（${g.count}）`}
          >
            <span className="chip-dot" style={{ background: `var(--cat-${g.id})` }} />
            <span>{g.id}</span>
            <span className="tiny num" style={{ marginLeft: 2 }}>{g.count}</span>
          </button>
        );
      })}
      {breakthroughCount > 0 && (
        <button
          className={'btn' + (onlyBreakthrough ? ' active' : '')}
          onClick={onToggleBreakthrough}
          style={{ padding: '2px 8px', fontSize: 11, marginLeft: 4 }}
          title="只看突破點"
        >
          <span className="breakthrough-star">★</span>
          <span>只看突破</span>
          <span className="tiny num" style={{ marginLeft: 2 }}>{breakthroughCount}</span>
        </button>
      )}
    </div>
  );
}
